require('dotenv').config();
const { GoogleGenAI } = require("@google/genai");

const key = process.env.GEMINI_API_KEY;
console.log(`Testing Key: ${key ? key.substring(0, 5) + '...' : 'NONE'}`);

const client = new GoogleGenAI({ apiKey: key });

async function test() {
    try {
        console.log("Attempting to generate with gemini-3-flash-preview...");
        const response = await client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: "Hello, are you working?",
        });
        console.log("Success!");
        console.log(response);
    } catch (error) {
        console.error("FAILED.");
        console.error("Status:", error.status);
        if (error.response) {
            console.error("Response:", JSON.stringify(error.response, null, 2));
        }
        console.error("Full Error:", JSON.stringify(error, null, 2));
    }
}

test();
