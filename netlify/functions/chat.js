exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const body = JSON.parse(event.body);
        const { password, messages } = body;

        // 1. Vérification du mot de passe
        if (password !== process.env.APP_PASSWORD) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: "Non autorisé" })
            };
        }

        // 2. Appel à l'API OpenRouter
        const openrouterApiKey = process.env.OPENROUTER_API_KEY;
        const openrouterModel = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openrouterApiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://yazikovaya.netlify.app", 
                "X-Title": "КАТАЛОГ System" 
            },
            body: JSON.stringify({
                model: openrouterModel,
                messages: messages
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: data.error?.message || "Erreur OpenRouter" })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ reply: data.choices[0].message.content })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Erreur serveur: " + error.message })
        };
    }
};
