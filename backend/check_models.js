const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

async function listModels() {
    try {
        const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        // The new SDK might not have a direct listModels helper on the client root or it might be different.
        // Let's try the standard REST way if SDK is obscure, but SDK usually has it.
        // Actually, for @google/genai, it's client.models.list()

        console.log("Checking available models...");
        const response = await client.models.list();

        console.log("--- AVAILABLE MODELS ---");
        // The response structure might be { models: [...] } or just an array
        // Let's print the whole thing safely
        if (response.models) {
            response.models.forEach(m => console.log(m.name));
        } else {
            console.log(JSON.stringify(response, null, 2));
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
