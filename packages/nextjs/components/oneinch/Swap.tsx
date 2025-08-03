"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { ArrowDownIcon } from "@heroicons/react/24/solid";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
}

export const Swap = () => {
  const { address, isConnected } = useAccount();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isTokensLoading, setIsTokensLoading] = useState<boolean>(true);
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("");
  const [slippage] = useState<number>(1);
  const [isQuoteLoading, setIsQuoteLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { data: balance } = useBalance({ address, token: fromToken?.address as `0x${string}` | undefined });
  const { data: hash, sendTransaction, isPending: isSendTxLoading } = useSendTransaction();
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isTxSuccess) {
      toast.success("Обмен успешно завершен!");
    }
  }, [isTxSuccess]);

  useEffect(() => {
    const fetchTokens = async () => {
      setIsTokensLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/1inch/tokens");
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Не удалось загрузить токены через наш сервер");
        }
        const data = await response.json();
        const tokenList: Token[] = Object.values(data.tokens);
        setTokens(tokenList);
        setFromToken(tokenList.find(t => t.symbol === "ETH") || null);
        setToToken(tokenList.find(t => t.symbol === "USDC") || null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsTokensLoading(false);
      }
    };
    fetchTokens();
  }, []);

  useEffect(() => {
    if (!fromToken || !toToken || !fromAmount || Number(fromAmount) <= 0) {
      setToAmount("");
      return;
    }

    const getQuote = async () => {
      setIsQuoteLoading(true);
      setError(null);
      try {
        const amount = parseFloat(fromAmount) * 10 ** fromToken.decimals;
        const params = new URLSearchParams({
          src: fromToken.address,
          dst: toToken.address,
          amount: amount.toFixed(0),
        });

        const response = await fetch(`/api/1inch/quote?${params.toString()}`);
        const data = await response.json();

        if (response.status !== 200) {
          throw new Error(data.error || "Ошибка получения квоты");
        }

        const calculatedToAmount = (Number(data.toAmount) / 10 ** toToken.decimals).toFixed(5);
        setToAmount(calculatedToAmount);
      } catch (e: any) {
        setError(e.message);
        setToAmount("");
      }
      setIsQuoteLoading(false);
    };

    const timeoutId = setTimeout(getQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [fromToken, toToken, fromAmount]);

  const handleSwap = async () => {
    if (!fromToken || !toToken || !fromAmount || !address) return;
    setError(null);
    try {
      const amount = parseFloat(fromAmount) * 10 ** fromToken.decimals;
      const swapParams = {
        src: fromToken.address,
        dst: toToken.address,
        amount: amount.toFixed(0),
        from: address,
        slippage: slippage.toString(),
        disableEstimate: "true",
      };

      const params = new URLSearchParams(swapParams).toString();
      const response = await fetch(`/api/1inch/swap?${params}`);
      const data = await response.json();

      if (response.status !== 200) {
        throw new Error(data.error || "Не удалось получить данные для обмена");
      }

      sendTransaction({
        to: data.tx.to,
        data: data.tx.data,
        value: BigInt(data.tx.value),
      });
      toast.success("Транзакция отправлена! Ожидайте подтверждения.");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const renderTokenSelect = (
    token: Token | null,
    setToken: (token: Token) => void,
    amount: string,
    setAmount: (amount: string) => void,
    isFrom: boolean,
  ) => (
    <div className="bg-base-200 p-4 rounded-xl flex justify-between items-center">
      <input
        type="number"
        placeholder="0.0"
        className="input input-ghost text-2xl w-full"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        disabled={!isFrom}
      />
      <div className="dropdown dropdown-end">
        <label tabIndex={0} className="btn btn-ghost m-1">
          {isTokensLoading ? (
            <span className="loading loading-spinner"></span>
          ) : token ? (
            <div className="flex items-center space-x-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={token.logoURI} alt={token.symbol} className="w-6 h-6 rounded-full" />
              <span>{token.symbol}</span>
            </div>
          ) : (
            "Выбрать"
          )}
        </label>
        <ul
          tabIndex={0}
          className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 max-h-60 overflow-y-auto z-10"
        >
          {tokens.map(t => (
            <li key={t.address} onClick={() => setToken(t)}>
              <a>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.logoURI} alt={t.symbol} className="w-5 h-5 rounded-full" />
                {t.symbol}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-base-100 p-6 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-4">Обмен Токенов</h2>
      {renderTokenSelect(fromToken, setFromToken, fromAmount, setFromAmount, true)}
      {isConnected && balance && fromToken && (
        <div className="text-right text-sm text-gray-500 mt-1 pr-2">
          Баланс: {Number(balance.formatted).toFixed(4)} {balance.symbol}
        </div>
      )}
      <div className="flex justify-center my-2">
        <button onClick={switchTokens} className="btn btn-circle btn-ghost">
          <ArrowDownIcon className="h-6 w-6" />
        </button>
      </div>
      {renderTokenSelect(toToken, setToToken, toAmount, setToAmount, false)}

      {error && <div className="text-error text-center mt-4 p-2 bg-red-500/10 rounded-lg">{error}</div>}

      {hash && (
        <div className="text-success text-center mt-4">
          Транзакция отправлена!{" "}
          <a href={`https://base.blockscout.com/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="link">
            Посмотреть на Blockscout
          </a>
        </div>
      )}

      <div className="mt-6">
        <button
          className={`btn btn-primary w-full text-lg ${isQuoteLoading || isSendTxLoading || isTxLoading ? "loading" : ""}`}
          onClick={handleSwap}
          disabled={
            !isConnected ||
            isQuoteLoading ||
            isSendTxLoading ||
            isTxLoading ||
            !fromAmount ||
            Number(fromAmount) <= 0 ||
            !!error
          }
        >
          {isSendTxLoading || isTxLoading ? "Обмен в процессе..." : isConnected ? "Обменять" : "Подключите кошелек"}
        </button>
      </div>
    </div>
  );
};
