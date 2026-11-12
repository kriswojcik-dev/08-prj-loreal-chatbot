/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Send requests to the deployed Cloudflare Worker, not directly to OpenAI.
const API_URL = "https://loreal-worker.kwojcik4.workers.dev/";

// This instruction keeps the chatbot focused on L'Oréal beauty questions.
const systemPrompt =
  "You are a helpful L'Oréal beauty assistant. Only answer questions about L'Oréal products and brands, skincare, makeup, haircare, fragrances, beauty routines, product comparisons, recommendations, and other beauty-related guidance. If a question is unrelated to L'Oréal or beauty, do not answer the unrelated question. Instead, politely say that you can only help with L'Oréal products, routines, recommendations, and beauty topics, then invite the user to ask a relevant question. Do not invent product details; say when you are unsure.";

// Keep the conversation so the assistant can remember earlier messages.
const messages = [{ role: "system", content: systemPrompt }];

// Add a message to the chat window without treating it as HTML.
function displayMessage(role, content) {
  const message = document.createElement("p");
  message.className = `msg ${role}`;
  message.textContent = content;
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Set the initial message.
displayMessage("ai", "👋 Hello! How can I help you today?");

// Send the user's message to the Cloudflare Worker.
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) {
    return;
  }

  displayMessage("user", message);
  messages.push({ role: "user", content: message });
  userInput.value = "";

  const sendButton = document.getElementById("sendBtn");
  sendButton.disabled = true;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error("The API returned no chatbot response.");
    }

    messages.push({ role: "assistant", content: reply });
    displayMessage("ai", reply);
  } catch (error) {
    console.error("Unable to get a chatbot response:", error);
    displayMessage(
      "ai",
      "Sorry, I could not connect right now. Please try again.",
    );
  } finally {
    sendButton.disabled = false;
    userInput.focus();
  }
});
