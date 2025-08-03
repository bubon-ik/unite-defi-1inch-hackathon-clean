import { NextResponse } from "next/server";

const CHAIN_ID = 8453; // Сеть Base

export async function GET() {
  console.log("\n--- [СЕРВЕР] Получен запрос на /api/1inch/tokens ---");

  const API_KEY = process.env.ONEINCH_API_KEY;

  if (!API_KEY) {
    console.error("--- [СЕРВЕР] КРИТИЧЕСКАЯ ОШИБКА: Ключ 'ONEINCH_API_KEY' не найден.");
    return NextResponse.json({ error: "Ключ API не настроен на сервере." }, { status: 500 });
  }

  console.log(`--- [СЕРВЕР] Ключ API найден. Начинаю запрос к 1inch...`);

  try {
    const response = await fetch(`https://api.1inch.dev/swap/v6.0/${CHAIN_ID}/tokens`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      cache: "no-store",
    });

    console.log(`--- [СЕРВЕР] Ответ от 1inch получен со статусом: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("--- [СЕРВЕР] ПОЛУЧЕН ТЕКСТ ОШИБКИ ОТ 1INCH: --->", errorText, "<---");

      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log("--- [СЕРВЕР] УСПЕХ! Данные от 1inch получены.");
    return NextResponse.json(data);
  } catch (error) {
    console.error("--- [СЕРВЕР] НЕПРЕДВИДЕННАЯ ОШИБКА:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера." }, { status: 500 });
  }
}
