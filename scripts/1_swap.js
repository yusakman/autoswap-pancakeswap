const { ethers } = require("ethers");
require("dotenv").config();

const contract = require("../abi/pcsRouterABI.json");
const BEP20 = require("../abi/erc20ABI.json");
const PRIVKEY_1 = process.env.PRIVKEY_1;
const ANKR_URL = process.env.ANKR_URL;
const addresses = {
  pcsRouterAddress: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  CAKE: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
};

// Use this function when the network is crowded
const wait = (seconds) => {
  const miliseconds = seconds * 1000;
  return new Promise((resolve) => setTimeout(resolve, miliseconds));
};

// ANKR Provider
const provider = new ethers.providers.JsonRpcProvider(`${ANKR_URL}`);

// Signer First Account
const firstAccount = new ethers.Wallet(PRIVKEY_1, provider);
console.log("my address", firstAccount.address);

// Contract Instance
const pcsRouterContract = new ethers.Contract(
  addresses.pcsRouterAddress,
  contract.abi,
  firstAccount
);

// Add tokens you want to trade from and to
const tokenFrom = addresses.WBNB;
const tokenTo = addresses.CAKE;

// Contract for calling approve later
const tokenFromContract = new ethers.Contract(
  tokenFrom,
  BEP20.abi,
  firstAccount
);

const tokenToContract = new ethers.Contract(tokenTo, BEP20.abi, firstAccount);

async function main() {
  let tx, result;

  // Check the symbols of the tokens you want to trade
  const symbolTokenFrom = await tokenFromContract.symbol();
  const symbolTokenTo = await tokenToContract.symbol();
  // const nameTokenFrom = await tokenFromContract.name();
  console.log(
    `You want to trade from ${symbolTokenFrom} token to  ${symbolTokenTo}`
  );

  // Check the balance of tokenFrom in our account
  // In this case WBNB
  const balanceTokenFrom = await tokenFromContract
    .connect(firstAccount)
    .balanceOf(firstAccount.address);
  console.log("Your balanceTokenFrom balance is");
  console.log(balanceTokenFrom); // Before format
  console.log("Formatted", ethers.utils.formatEther(balanceTokenFrom)); // After format

  // Use this balance for trade
  // For example BNBCAKE pair, so we'll use this as BNB balance
  const percent = 100; // Change this value to how much you want to trade, exm: 10, 20, 50, etc
  const amountToTrade =
    (percent / 100) * ethers.utils.formatEther(balanceTokenFrom);
  console.log(`Amount to trade ${amountToTrade}`);

  // 1st paramater of swapExactTokensForTokens()
  // amountIn = tokenTo amount we want to trade
  const amountIn = ethers.utils.parseEther(`${amountToTrade}`, "ether");
  console.log(`amountIn, ${amountIn}`);

  // Calculate the next paramater by calling getAmountsOut
  const amounts = await pcsRouterContract
    .connect(firstAccount)
    .getAmountsOut(amountIn, [tokenFrom, tokenTo]);

  // Now we get the result for the 2nd paramater of swapExactTokensForTokens()
  const slippage = 5;
  const formatAmountOutMin = (
    ((100 - slippage) / 100) *
    ethers.utils.formatEther(amounts[1])
  ).toFixed(10); // toFixed
  console.log(`Formatted amount: ${formatAmountOutMin}`);

  const amountOutMin = ethers.utils.parseEther(
    `${formatAmountOutMin}`,
    "ether"
  );
  console.log(`The amountOutMin`);
  console.log(amountOutMin);

  // Add 3 more parameters of swapExactTokensForTokens()
  const path = [tokenFrom, tokenTo];
  const to = firstAccount.address;
  const deadline = Date.now() + 1000 * 60 * 10; // 10 minutes

  // Approve tokenFrom for trade
  const amountToApprove = 0.5;
  tx = await tokenFrom
    .connect(firstAccount)
    .approve(
      addresses.pcsRouterAddress,
      ethers.utils.parseUnits(amountToApprove.toString(), "ether")
    );
  result = await tx.wait();
  console.log(`Approved ${amountToApprove} of ${symbolTokenFrom}`);

  // Let's check balance of both tokens before trade
  // Check balanceOf tokenTo contract
  const balanceTokenFromBefore = await tokenFromContract
    .connect(firstAccount)
    .balanceOf(firstAccount.address);
  console.log(`Balance of ${symbolTokenFrom} before trade:`);
  console.log(ethers.utils.formatEther(balanceTokenFromBefore));

  // Check balanceOf tokenFrom Contract
  const balanceTokenToBefore = await tokenToContract
    .connect(firstAccount)
    .balanceOf(firstAccount.address);
  console.log(`Balance of ${symbolTokenTo} before trade:`);
  console.log(ethers.utils.formatEther(balanceTokenToBefore));

  // Perform the swap
  tx = await pcsRouterContract
    .connect(firstAccount)
    .swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline, {
      gasLimit: ethers.utils.hexlify(200000), // This should be bigger >150k, but beware of setting it too high
      gasPrice: ethers.utils.parseUnits("5", "gwei"),
    });
  result = await tx.wait();
  console.log(result);

  // Check balance of both tokens after trade
  // Check balanceOf tokenFrom after trde
  const balanceTokenFromAfter = await tokenFromContract
    .connect(firstAccount)
    .balanceOf(firstAccount.address);
  console.log(`Balance ${symbolTokenFrom} after trade`);
  console.log(ethers.utils.formatEther(balanceTokenFromAfter));

  const balanceTokenToAfter = await tokenToContract
    .connect(firstAccount)
    .balanceOf(firstAccount.address);
  console.log(`Balance ${symbolTokenTo} after trade`);
  console.log(ethers.utils.formatEther(balanceTokenToAfter));
}

main();
