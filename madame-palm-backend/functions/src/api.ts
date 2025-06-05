import { onRequest } from "firebase-functions/v2/https";
import OpenAI from "openai";
import cors from "cors";
import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";

// Express
const app = express();

app.use(cors({
    origin: ["https://madame-palm.web.app", "http://localhost:4200"],
    credentials: true
}));

app.use(express.json({ limit: "6mb" }));

// Rate limit
const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        error: "You've reached the limit. Please try again in an hour."
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Health check
app.get("/", (_, res) => {
    res.send("Madame Palm API is alive!");
});

// Main endpoint
app.post("/readHand", limiter, async (req: Request, res: Response) => {
    console.log("Received palm reading request.");

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    try {
        const { base64, mimeType = "image/jpeg" } = req.body;

        if (!base64 || typeof base64 !== "string") {
            res.status(400).json({ error: "Missing or invalid 'base64'" });
            return;
        }

        // Prompt
        const prompt = `You are a palm reader. Analyze the hand in this image and give a mystical, fun palm reading.
Speak directly to the person as "you" — not "they" or "the person", and begin the reading immediately with no introductions.

Do not use any Markdown formatting (no asterisks, bold, italics, or headers). Only plain text.

For each major line — Heart Line, Head Line, and Life Line — write one sentence (max 150 characters) explaining its meaning and significance.

Then, write an overall summary of this person's character or destiny based on their palm (max 250 characters).

Respond exactly in this format:

Heart Line: [max 150 characters]
Head Line: [max 150 characters]
Life Line: [max 150 characters]

Overall Summary: [max 250 characters]
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: prompt },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Please read my palm" },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${base64}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000,
        });

        // Calculate cost
        let totalCost = 0;
        const usage = response.usage;
        if (usage) {
            const promptTokens = usage.prompt_tokens || 0;
            const completionTokens = usage.completion_tokens || 0;

            const inputCost = promptTokens * 0.005 / 1000;
            const outputCost = completionTokens * 0.015 / 1000;
            totalCost = inputCost + outputCost;

            console.log(`Prompt tokens: ${promptTokens}, Completion tokens: ${completionTokens}`);
            console.log(`Estimated cost: $${totalCost.toFixed(6)}`);
        }

        // Send response for coat
        const reading = response.choices[0]?.message?.content || "No reading returned.";
        res.status(200).json({ reading, cost: totalCost.toFixed(6) });


        // Error
    } catch (err: any) {
        console.error("Error in /readHand:", err);

        if (err.response) {
            console.error("OpenAI API Error Response:", JSON.stringify(err.response.data || {}, null, 2));
        }

        res.status(500).json({
            error: "Failed to process palm reading",
            details: err.message || "Unknown error"
        });
    }
});

// Export Firebase
export const readHand = onRequest({
    region: "us-central1",
    secrets: ["OPENAI_API_KEY"]
}, app);
