import math
import re
from flask import Flask, Response, jsonify, render_template, request
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
# When hosted online, trust the host's proxy so links use the real https:// address
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# A number looks like "12", "3.5", "7." or ".5"
NUMBER = r"(?:\d+\.?\d*|\.\d+)"
# A valid expression: number, then any amount of (operator + number). Numbers may be negative.
VALID = re.compile(rf"^-?{NUMBER}(?:[+\-*/]-?{NUMBER})*$")


def calculate(expression):
    """Safely calculate something like '12+3*4' WITHOUT using eval()."""
    expression = expression.replace(" ", "")
    if not VALID.match(expression):
        raise ValueError("Invalid input")

    # Split into numbers and operators. A "-" at the start or after another operator is a negative sign.
    tokens = re.findall(rf"(?<![\d.])-?{NUMBER}|[+\-*/]", expression)

    # Do * and / first, keep + and - for the end (normal math order).
    numbers = [float(tokens[0])]
    for op, num in zip(tokens[1::2], tokens[2::2]):
        num = float(num)
        if op == "*":
            numbers[-1] *= num
        elif op == "/":
            numbers[-1] /= num  # raises ZeroDivisionError when dividing by 0
        else:
            numbers.append(num if op == "+" else -num)

    result = sum(numbers)
    if not math.isfinite(result):
        raise ValueError("Number too big")
    # Show 4 instead of 4.0, and hide tiny float noise like 0.30000000000000004
    return int(result) if result.is_integer() else round(result, 10)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/calculate", methods=["POST"])
def calculate_route():
    # The browser sends JSON like {"expression": "12+3"}; we answer {"result": 15}
    data = request.get_json(silent=True) or {}
    try:
        return jsonify(result=calculate(str(data.get("expression", ""))))
    except (ValueError, ZeroDivisionError):
        return jsonify(result="Error")


@app.route("/robots.txt")
def robots():
    # Tells search engines they may crawl everything and where the sitemap is
    text = f"User-agent: *\nAllow: /\nSitemap: {request.url_root}sitemap.xml\n"
    return Response(text, mimetype="text/plain")


@app.route("/sitemap.xml")
def sitemap():
    # Lists the pages of the site for search engines (we only have one)
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
           f"<url><loc>{request.url_root}</loc></url></urlset>")
    return Response(xml, mimetype="application/xml")


if __name__ == "__main__":
    app.run(debug=True)  # debug=True auto-reloads when you edit files (local use only)
