from flask import Flask, render_template, request, flash
import datetime

app = Flask(__name__)


@app.context_processor
def inject_today_date():
    return {'year': datetime.date.today().year}


@app.route('/')
def home():
    return render_template('home.html')

@app.route('/dash')
def dash():
    return render_template('dash.html')

@app.route('/rag')
def rag():
    return render_template('rag.html')

@app.route('/map')
def map():
    return render_template('sf_towers_map1.html')

@app.route('/map_risk_areas')
def map_risk_areas():
    return render_template('sf_towers_map2.html')

@app.route('/map_cell_towers')
def map_cell_towers():
    return render_template('sf_towers_map3.html')


if __name__ == '__main__':
    app.run(debug=True)
    #app.run("0.0.0.0", port=80, debug=False)