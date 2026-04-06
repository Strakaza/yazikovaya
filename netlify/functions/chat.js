exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const body = JSON.parse(event.body);
        const { password, messages, action } = body;

        // 1. Vérification stricte du mot de passe
        if (password !== process.env.APP_PASSWORD) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: "Mot de passe incorrect" })
            };
        }

        // 2. Si l'interface veut juste vérifier le login, on s'arrête là (Succès !)
        if (action === 'login') {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true })
            };
        }

        // 3. Si l'action est un chat, on appelle OpenRouter
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
                statusCode: 400, // On renvoie 400 (Bad Request) et plus 401 pour ne pas déclencher le rechargement forcé
                body: JSON.stringify({ error: data.error?.message || "Erreur venant d'OpenRouter." })
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
