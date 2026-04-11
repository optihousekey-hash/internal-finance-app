export default async function handler(req, res) {
  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_OWNER = process.env.GITHUB_OWNER;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
    const DATA_FILE_PATH = process.env.DATA_FILE_PATH || "data/transactions.json";

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      return res.status(500).json({
        error: "Не задані server environment variables для GitHub."
      });
    }

    const githubApiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_FILE_PATH}`;

    async function getFileFromGitHub() {
      const response = await fetch(
        `${githubApiBase}?ref=${encodeURIComponent(GITHUB_BRANCH)}`,
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json"
          }
        }
      );

      if (response.status === 404) {
        return { sha: null, content: [] };
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`GitHub GET error: ${response.status} ${text}`);
      }

      const data = await response.json();
      const decoded = Buffer.from(data.content, "base64").toString("utf-8");
      const parsed = decoded.trim() ? JSON.parse(decoded) : [];

      return {
        sha: data.sha,
        content: Array.isArray(parsed) ? parsed : []
      };
    }

    async function saveFileToGitHub(contentArray, sha, message) {
      const contentString = JSON.stringify(contentArray, null, 2);
      const contentBase64 = Buffer.from(contentString, "utf-8").toString("base64");

      const body = {
        message,
        content: contentBase64,
        branch: GITHUB_BRANCH
      };

      if (sha) {
        body.sha = sha;
      }

      const response = await fetch(githubApiBase, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`GitHub PUT error: ${response.status} ${text}`);
      }

      return response.json();
    }

    if (req.method === "GET") {
      const file = await getFileFromGitHub();
      return res.status(200).json({
        success: true,
        items: file.content
      });
    }

    if (req.method === "POST") {
      const {
        date,
        person,
        type,
        category,
        amount,
        comment,
        balanceTarget,
        transferFrom,
        transferTo
      } = req.body || {};

      if (!date || !person || !type || !category || amount === undefined || amount === null) {
        return res.status(400).json({
          error: "Обов’язкові поля: date, person, type, category, amount."
        });
      }

      if (!["income", "expense", "transfer"].includes(type)) {
        return res.status(400).json({
          error: "type має бути income, expense або transfer."
        });
      }

      const numericAmount = Number(amount);
      if (Number.isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          error: "amount має бути числом більше 0."
        });
      }

      if ((type === "income" || type === "expense") && !balanceTarget) {
        return res.status(400).json({
          error: "Для income/expense потрібно вказати balanceTarget."
        });
      }

      if (type === "transfer") {
        if (!transferFrom || !transferTo) {
          return res.status(400).json({
            error: "Для transfer потрібно вказати transferFrom і transferTo."
          });
        }

        if (transferFrom === transferTo) {
          return res.status(400).json({
            error: "Баланс відправки і баланс отримання не можуть бути однакові."
          });
        }
      }

      const file = await getFileFromGitHub();

      const newItem = {
        id: Date.now().toString(),
        date,
        person: String(person).trim(),
        type,
        category: String(category).trim(),
        amount: numericAmount,
        comment: String(comment || "").trim(),
        balanceTarget: balanceTarget || null,
        transferFrom: transferFrom || null,
        transferTo: transferTo || null,
        createdAt: new Date().toISOString()
      };

      const updated = [...file.content, newItem];

      await saveFileToGitHub(
        updated,
        file.sha,
        `Add transaction ${newItem.id}`
      );

      return res.status(200).json({
        success: true,
        item: newItem
      });
    }

    if (req.method === "PUT") {
      const {
        id,
        date,
        person,
        type,
        category,
        amount,
        comment,
        balanceTarget,
        transferFrom,
        transferTo
      } = req.body || {};

      if (!id) {
        return res.status(400).json({
          error: "Потрібен id для оновлення."
        });
      }

      if (!date || !person || !type || !category || amount === undefined || amount === null) {
        return res.status(400).json({
          error: "Обов’язкові поля: date, person, type, category, amount."
        });
      }

      if (!["income", "expense", "transfer"].includes(type)) {
        return res.status(400).json({
          error: "type має бути income, expense або transfer."
        });
      }

      const numericAmount = Number(amount);
      if (Number.isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          error: "amount має бути числом більше 0."
        });
      }

      if ((type === "income" || type === "expense") && !balanceTarget) {
        return res.status(400).json({
          error: "Для income/expense потрібно вказати balanceTarget."
        });
      }

      if (type === "transfer") {
        if (!transferFrom || !transferTo) {
          return res.status(400).json({
            error: "Для transfer потрібно вказати transferFrom і transferTo."
          });
        }

        if (transferFrom === transferTo) {
          return res.status(400).json({
            error: "Баланс відправки і баланс отримання не можуть бути однакові."
          });
        }
      }

      const file = await getFileFromGitHub();
      const existing = file.content.find((item) => item.id === id);

      if (!existing) {
        return res.status(404).json({
          error: "Операцію не знайдено."
        });
      }

      const updatedItems = file.content.map((item) => {
        if (item.id !== id) return item;

        return {
          ...item,
          date,
          person: String(person).trim(),
          type,
          category: String(category).trim(),
          amount: numericAmount,
          comment: String(comment || "").trim(),
          balanceTarget: balanceTarget || null,
          transferFrom: transferFrom || null,
          transferTo: transferTo || null
        };
      });

      await saveFileToGitHub(
        updatedItems,
        file.sha,
        `Update transaction ${id}`
      );

      return res.status(200).json({
        success: true
      });
    }

    if (req.method === "DELETE") {
      const { id } = req.body || {};

      if (!id) {
        return res.status(400).json({
          error: "Потрібен id для видалення."
        });
      }

      const file = await getFileFromGitHub();
      const updated = file.content.filter((item) => item.id !== id);

      await saveFileToGitHub(
        updated,
        file.sha,
        `Delete transaction ${id}`
      );

      return res.status(200).json({
        success: true
      });
    }

    return res.status(405).json({
      error: "Method not allowed"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
}
