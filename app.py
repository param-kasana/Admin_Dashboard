from flask import Flask, render_template, request, redirect, url_for, session
import os
import pandas as pd
import requests
from prompt_lab import prompt_lab_bp
from flask_cors import CORS
from routes.core import core_bp
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from dotenv import load_dotenv 
import psycopg2
from config import DB_CONFIG 

app = Flask(__name__)
load_dotenv()

CORS(app)

app.register_blueprint(core_bp)
app.secret_key = "secret_key"

USERNAME = "admin"
PASSWORD = "admin"

@app.route("/")
def home_redirect():
    return redirect(url_for("login"))

@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        if username == USERNAME and password == PASSWORD:
            session["logged_in"] = True
            session["user"] = username
            return redirect(url_for("dashboard"))
        else:
            error = "Invalid username or password"

    return render_template("login.html", error=error)

@app.route("/logout")
def logout():
    session.pop("logged_in", None)
    return redirect(url_for("login"))

@app.route("/dashboard")
def dashboard():
    if not session.get("logged_in"):
        return redirect(url_for("login"))

    data_dir = os.path.join("static", "data")
    chart_dir = os.path.join("static", "charts")
    os.makedirs(chart_dir, exist_ok=True)

    try:
        users_df = pd.read_csv(os.path.join(data_dir, "demo_users.csv"), parse_dates=["createdAt"])
        results_df = pd.read_csv(os.path.join(data_dir, "demo_results.csv"), parse_dates=["createdAt"])
        answers_df = pd.read_csv(os.path.join(data_dir, "demo_answers.csv"), parse_dates=["createdAt"])
    except FileNotFoundError:
        app.logger.error("One or more demo CSV files not found in static/data.")
        return render_template("dashboard.html", error_message="Data files not found.", average_time=0, views_count=0, start_count=0, complete_count=0)


    avg_time_series = answers_df.groupby("userId")["createdAt"].apply(lambda x: (x.max() - x.min()).total_seconds() if not x.empty else 0)
    avg_time = avg_time_series.mean() if not avg_time_series.empty else 0
    
    views_count = users_df.shape[0]
    start_count = answers_df["userId"].nunique()
    complete_count = (answers_df.groupby("userId")["question"].nunique() == 8).sum()

    daily_users = users_df["createdAt"].dt.date.value_counts().sort_index()
    if not daily_users.empty:
        plt.figure(figsize=(6, 3))
        daily_users.plot(marker="o", color="#aa00ff")
        plt.title("Daily Users")
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(os.path.join(chart_dir, "daily_users.png"), bbox_inches='tight', pad_inches=0.1)
        plt.close()
    else:
        app.logger.info("No daily user data to plot.")


    result_distribution = results_df["highestOption"].value_counts().sort_index()
    if not result_distribution.empty:
        plt.figure(figsize=(4, 4))
        result_distribution.plot(kind="pie", autopct='%1.1f%%', startangle=90)
        plt.title("Result Type Distribution")
        plt.ylabel("")
        plt.tight_layout()
        plt.savefig(os.path.join(chart_dir, "result_distribution.png"), bbox_inches='tight', pad_inches=0.1)
        plt.close()
    else:
        app.logger.info("No result distribution data to plot.")


    for i in range(1, 9):
        question_label = f"Question {i}"
        chart_path = os.path.join(chart_dir, f"question{i}_distribution.png")
        q_counts = answers_df[answers_df["question"] == question_label]["option"].value_counts().sort_index()

        if not q_counts.empty:
            plt.figure(figsize=(5, 4))
            q_counts.plot(kind="bar", color=["#f77", "#77b", "#7b7", "#ff7", "#aaa", "#ccc", "#9cf", "#7d7", "#fbb"])
            plt.title(f"{question_label} Option Distribution")
            plt.xlabel("Option")
            plt.ylabel("Count")
            plt.tight_layout()
            plt.savefig(chart_path, bbox_inches='tight', pad_inches=0.1)
            plt.close()
        else:
            app.logger.info(f"No data for {question_label} to plot.")


    return render_template("dashboard.html",
        average_time=round(avg_time, 1) if avg_time else 0,
        views_count=views_count,
        start_count=start_count,
        complete_count=complete_count)

@app.route("/users")
def users():
    if not session.get("logged_in"):
        return redirect(url_for("login"))
    return render_template("users.html")

@app.route("/email-composer")
def email_composer():
    if not session.get("logged_in"):
        return redirect(url_for("login"))
    return render_template("email_composer.html")

@app.route("/generate_email")
def generate_email_page():
    if not session.get("logged_in"):
        return redirect(url_for("login"))
    return render_template("generate_email.html")

app.register_blueprint(prompt_lab_bp)

if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    app.logger.info("Starting Flask application...")
    app.run(debug=True)