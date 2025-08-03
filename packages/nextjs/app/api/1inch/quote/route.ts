import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.ONEINCH_API_KEY;

export async function GET(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: "API ключ не найден на сервере" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const chainId = 8453; // Base

  const url = `https://api.1inch.dev/swap/v6.0/${chainId}/quote?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Ошибка при запросе квоты:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера при запросе квоты" }, { status: 500 });
  }
}
