require('dotenv').config();
const { GoogleGenAI } = require("@google/genai");

const key = process.env.GEMINI_API_KEY;
console.log(`Testing Key: ${key ? key.substring(0, 5) + '...' : 'NONE'}`);

const client = new GoogleGenAI({ apiKey: key });

async function test() {
    try {
        console.log("Attempting to generate with gemini-2.0-flash...");
        // Trying the newest stable model first
        const response = await client.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: "Hello",
        });
        console.log("Success with gemini-2.0-flash!");
        return;
    } catch (error) {
        console.log("gemini-2.0-flash failed: " + error.status);
    }

    try {
        console.log("Attempting to generate with gemini-1.5-flash...");
        const response = await client.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: "Hello",
        });
        console.log("Success with gemini-1.5-flash!");
    } catch (error) {
        console.error("gemini-1.5-flash FAILED.");
        console.error("Full Error:", JSON.stringify(error, null, 2));
    }
}

test();
