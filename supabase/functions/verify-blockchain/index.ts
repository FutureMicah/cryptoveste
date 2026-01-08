import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BlockchainVerifyRequest {
  cryptoPaymentId: string;
}

// Blockchain explorer APIs
const EXPLORERS = {
  BTC: "https://blockchain.info/rawtx/",
  ETH: "https://api.etherscan.io/api?module=transaction&action=gettxreceiptstatus&txhash=",
  USDT_TRC20: "https://apilist.tronscan.org/api/transaction-info?hash=",
  USDT_ERC20: "https://api.etherscan.io/api?module=transaction&action=gettxreceiptstatus&txhash=",
  USDC: "https://api.etherscan.io/api?module=transaction&action=gettxreceiptstatus&txhash=",
};

const REQUIRED_CONFIRMATIONS = {
  BTC: 3,
  ETH: 12,
  USDT_TRC20: 19,
  USDT_ERC20: 12,
  USDC: 12,
};

async function verifyBitcoinTransaction(txHash: string) {
  try {
    const response = await fetch(`${EXPLORERS.BTC}${txHash}`);
    if (!response.ok) return { verified: false, confirmations: 0 };
    
    const data = await response.json();
    const blockHeight = data.block_height;
    
    if (!blockHeight) return { verified: false, confirmations: 0 };
    
    // Get current block height
    const latestBlockRes = await fetch("https://blockchain.info/latestblock");
    const latestBlock = await latestBlockRes.json();
    const confirmations = latestBlock.height - blockHeight + 1;
    
    return {
      verified: confirmations >= REQUIRED_CONFIRMATIONS.BTC,
      confirmations,
      amount: data.out?.reduce((sum: number, o: any) => sum + o.value, 0) / 100000000,
    };
  } catch (error) {
    console.error("BTC verification error:", error);
    return { verified: false, confirmations: 0 };
  }
}

async function verifyEthereumTransaction(txHash: string, network: string) {
  try {
    const apiKey = Deno.env.get("ETHERSCAN_API_KEY") || "";
    const url = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.result || data.result.status !== "0x1") {
      return { verified: false, confirmations: 0 };
    }
    
    // Get confirmation count
    const blockNumberRes = await fetch(
      `https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=${apiKey}`
    );
    const blockData = await blockNumberRes.json();
    
    const txBlockNumber = parseInt(data.result.blockNumber, 16);
    const currentBlock = parseInt(blockData.result, 16);
    const confirmations = currentBlock - txBlockNumber;
    
    const required = REQUIRED_CONFIRMATIONS[network as keyof typeof REQUIRED_CONFIRMATIONS] || 12;
    
    return {
      verified: confirmations >= required,
      confirmations,
    };
  } catch (error) {
    console.error("ETH verification error:", error);
    return { verified: false, confirmations: 0 };
  }
}

async function verifyTronTransaction(txHash: string) {
  try {
    const response = await fetch(`${EXPLORERS.USDT_TRC20}${txHash}`);
    const data = await response.json();
    
    if (!data.confirmed) return { verified: false, confirmations: 0 };
    
    const confirmations = data.confirmations || 0;
    
    return {
      verified: confirmations >= REQUIRED_CONFIRMATIONS.USDT_TRC20,
      confirmations,
      amount: data.tokenTransferInfo?.amount_str ? 
        parseFloat(data.tokenTransferInfo.amount_str) / 1000000 : undefined,
    };
  } catch (error) {
    console.error("TRC20 verification error:", error);
    return { verified: false, confirmations: 0 };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { cryptoPaymentId }: BlockchainVerifyRequest = await req.json();

    // Get crypto payment details
    const { data: cryptoPayment, error: fetchError } = await supabase
      .from("crypto_payments")
      .select("*, payments(*)")
      .eq("id", cryptoPaymentId)
      .single();

    if (fetchError || !cryptoPayment) {
      throw new Error("Crypto payment not found");
    }

    const { transaction_hash, cryptocurrency, network } = cryptoPayment;
    
    let verificationResult;
    
    switch (cryptocurrency) {
      case "BTC":
        verificationResult = await verifyBitcoinTransaction(transaction_hash);
        break;
      case "ETH":
      case "USDC":
      case "USDT_ERC20":
        verificationResult = await verifyEthereumTransaction(transaction_hash, cryptocurrency);
        break;
      case "USDT_TRC20":
        verificationResult = await verifyTronTransaction(transaction_hash);
        break;
      default:
        verificationResult = { verified: false, confirmations: 0 };
    }

    // Update crypto payment status
    const newStatus = verificationResult.verified ? "confirmed" : "pending";
    
    await supabase
      .from("crypto_payments")
      .update({
        status: newStatus,
        confirmations: verificationResult.confirmations,
      })
      .eq("id", cryptoPaymentId);

    // If verified, update the main payment status
    if (verificationResult.verified && cryptoPayment.payment_id) {
      await supabase
        .from("payments")
        .update({ status: "completed" })
        .eq("id", cryptoPayment.payment_id);

      // Send notification email
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            userId: cryptoPayment.user_id,
            type: "payment_approved",
            data: {
              amount: cryptoPayment.expected_amount,
              cryptocurrency,
              transactionHash: transaction_hash,
            },
          }),
        });
      } catch (emailError) {
        console.error("Email notification error:", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: verificationResult.verified,
        confirmations: verificationResult.confirmations,
        status: newStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Blockchain verification error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});