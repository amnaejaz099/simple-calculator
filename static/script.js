// The two lines of the display
const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");

let input = "";              // what the user typed, e.g. "12+3*4"
let justCalculated = false;  // true right after pressing "="
const OPERATORS = "+-*/";

// Show nice symbols on screen (× ÷ −) instead of * / -
function pretty(text) {
  return text.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−");
}

function render() {
  resultEl.textContent = pretty(input) || "0";
}

// Handle one key press (from a button or the keyboard)
function press(key) {
  const last = input.slice(-1);

  if (key === "C") {
    input = "";
    expressionEl.textContent = "";
  } else if (key === "back") {
    input = justCalculated ? "" : input.slice(0, -1);
  } else if (key === "=") {
    calculate();
    return;
  } else if (OPERATORS.includes(key)) {
    if (input === "" && key !== "-") return;           // only "-" can start a number
    if (OPERATORS.includes(last)) {
      if (input.length === 1) return;                  // can't replace the leading "-"
      input = input.slice(0, -1);                      // swap the previous operator
    }
    input += key;
  } else {
    // A digit or "."
    if (justCalculated) input = "";                    // start a fresh calculation
    const currentNumber = input.split(/[+\-*/]/).pop();
    if (key === "." && currentNumber.includes(".")) return;  // only one dot per number
    input += key === "." && currentNumber === "" ? "0." : key;
  }

  justCalculated = false;
  render();
}

// Send the expression to Flask and show the answer
async function calculate() {
  if (input === "" || OPERATORS.includes(input.slice(-1))) return;
  expressionEl.textContent = pretty(input) + " =";
  try {
    const response = await fetch("/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expression: input }),
    });
    const data = await response.json();
    input = data.result === "Error" ? "" : String(data.result);
    resultEl.textContent = data.result === "Error" ? "Error" : pretty(input);
  } catch {
    input = "";
    resultEl.textContent = "Error";
  }
  justCalculated = true;
}

// Clicks on the buttons
document.querySelector(".keys").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button) press(button.dataset.key);
});

// Keyboard support
document.addEventListener("keydown", (event) => {
  let key = event.key;
  if (key === "Enter" || key === "=") key = "=";
  else if (key === "Backspace") key = "back";
  else if (key === "Escape") key = "C";
  else if (!"0123456789.+-*/".includes(key) || key.length !== 1) return;

  event.preventDefault();  // stops Enter re-clicking a focused button, and "/" opening browser search
  press(key);

  // Briefly animate the matching on-screen button
  const button = document.querySelector(`[data-key="${key}"]`);
  if (button) {
    button.classList.add("pressed");
    setTimeout(() => button.classList.remove("pressed"), 120);
  }
});
