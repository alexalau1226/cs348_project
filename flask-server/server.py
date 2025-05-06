from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text  # Importing the `text` function for raw SQL queries

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///zoo_database.db'
db = SQLAlchemy(app)

# Models
class Habitat(db.Model):
    habitat = db.Column(db.String, primary_key=True)
    temperature = db.Column(db.Float, nullable=False)
    humidity = db.Column(db.Float, nullable=False)

class Animal(db.Model):
    __tablename__ = 'Animal'
    animal_id = db.Column(db.Integer, primary_key=True)
    species_name = db.Column(db.String, db.ForeignKey('species.species_name'), nullable=False)
    zoo_id = db.Column(db.Integer, db.ForeignKey('zoo.zoo_id'), nullable=False)
    name = db.Column(db.String, nullable=False)
    age = db.Column(db.Float, nullable=False)
    gender = db.Column(db.String, nullable=False)

    species = db.relationship('Species', backref='animals', lazy=True)
    zoo = db.relationship('Zoo', backref='animals', lazy=True)

class Zoo(db.Model):
    zoo_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    location = db.Column(db.String, nullable=False)

class Species(db.Model):
    species_name = db.Column(db.String, primary_key=True)
    food = db.Column(db.String, nullable=False)
    habitat = db.Column(db.String, db.ForeignKey('habitat.habitat'), nullable=False)
    habitat_relation = db.relationship('Habitat', backref='species', uselist=False)

class Employee(db.Model):
    emp_id = db.Column(db.Integer, primary_key=True)
    zoo_id = db.Column(db.Integer, db.ForeignKey('zoo.zoo_id'), nullable=False)
    first_name = db.Column(db.String, nullable=False)
    last_name = db.Column(db.String, nullable=False)
    job_title = db.Column(db.String, nullable=False)
    job_description = db.Column(db.String, nullable=False)
    zoo = db.relationship('Zoo', backref='employees', lazy=True)

# ORM — GET all zoos
@app.route('/zoos', methods=['GET'])
def get_zoos():
    zoos = Zoo.query.all()
    return jsonify([{"zoo_id": z.zoo_id, "name": z.name} for z in zoos])

# ORM & Prepared Statements — GET animals with filters and sorting (using ORM and prepared statement)
@app.route('/animals', methods=['GET'])
def get_animals():
    query = Animal.query

    # Apply filters based on request parameters (ORM)
    if (species := request.args.get('species_name')):
        query = query.filter_by(species_name=species)

    if (zoo_id := request.args.get('zoo_id')):
        query = query.filter_by(zoo_id=zoo_id)

    if (min_age := request.args.get('minAge')):
        query = query.filter(Animal.age >= min_age)

    if (max_age := request.args.get('maxAge')):
        query = query.filter(Animal.age <= max_age)

    if (gender := request.args.get('gender')):
        query = query.filter_by(gender=gender)

    # Sorting logic (ORM)
    if (sort_by := request.args.get('sort_by')):
        order = request.args.get('sort_order', 'asc')
        if sort_by in ['animal_id', 'name', 'age', 'gender', 'species_name', 'zoo_id'] and order in ['asc', 'desc']:
            query = query.order_by(getattr(Animal, sort_by).desc() if order == 'desc' else getattr(Animal, sort_by))

    animals = query.all()

    # Using Prepared Statement (for example: fetching animals by zoo_id using raw SQL)
    if zoo_id := request.args.get('zoo_id'):
        stmt = text("SELECT * FROM Animal WHERE zoo_id = :zoo_id")
        result = db.session.execute(stmt, {"zoo_id": zoo_id}).fetchall()
        animals_from_db = [{
            'animal_id': a.animal_id,
            'name': a.name,
            'age': a.age,
            'gender': a.gender,
            'species_name': a.species_name,
            'zoo_id': a.zoo_id
        } for a in result]
        return jsonify(animals_from_db)

    return jsonify([{
        'animal_id': a.animal_id,
        'name': a.name,
        'age': a.age,
        'gender': a.gender,
        'species_name': a.species_name,
        'zoo_id': a.zoo_id,
        'zoo_name': a.zoo.name
    } for a in animals])

# ORM — POST animal
@app.route('/animals', methods=['POST'])
def add_animal():
    data = request.json
    new_animal = Animal(**data)
    db.session.add(new_animal)
    db.session.commit()
    return jsonify({'message': 'Animal added'}), 201

# ORM & Prepared Statements — PUT update animal (ORM and prepared statement)
@app.route('/animals/<int:animal_id>', methods=['PUT'])
def update_animal(animal_id):
    data = request.json
    animal = Animal.query.get(animal_id)

    if not animal:
        return jsonify({'message': 'Animal not found'}), 404

    # Using ORM
    animal.name = data['name']
    animal.age = data['age']
    animal.gender = data['gender']
    animal.species_name = data['species_name']
    animal.zoo_id = data['zoo_id']

    # Using prepared statement (update via raw SQL)
    stmt = text("UPDATE Animal SET name = :name, age = :age, gender = :gender, species_name = :species_name, zoo_id = :zoo_id WHERE animal_id = :animal_id")
    db.session.execute(stmt, {
        "name": data['name'],
        "age": data['age'],
        "gender": data['gender'],
        "species_name": data['species_name'],
        "zoo_id": data['zoo_id'],
        "animal_id": animal_id
    })
    db.session.commit()

    return jsonify({'message': 'Animal updated'})

# ORM — DELETE animal
@app.route('/animals/<int:animal_id>', methods=['DELETE'])
def delete_animal(animal_id):
    animal = Animal.query.get(animal_id)

    if not animal:
        return jsonify({'message': 'Animal not found'}), 404

    db.session.delete(animal)
    db.session.commit()

    return jsonify({'message': 'Animal deleted'})

# ORM — GET species list
@app.route('/species', methods=['GET'])
def get_species():
    species = Species.query.all()
    return jsonify([s.species_name for s in species])

# ORM & Prepared Statements — GET species detail
@app.route('/species/<string:species_name>', methods=['GET'])
def get_species_details(species_name):
    # ORM query for species
    species = Species.query.filter_by(species_name=species_name).first()
    if not species:
        return jsonify({'message': 'Species not found'}), 404

    habitat_details = None
    if species.habitat_relation:
        habitat_details = {
            'habitat': species.habitat_relation.habitat,
            'temperature': species.habitat_relation.temperature,
            'humidity': species.habitat_relation.humidity
        }

    # Using prepared statement (for habitat details via raw SQL)
    stmt = text("SELECT habitat, temperature, humidity FROM Habitat WHERE habitat = :habitat")
    habitat_result = db.session.execute(stmt, {"habitat": species.habitat}).fetchone()
    if habitat_result:
        habitat_details = {
            'habitat': habitat_result[0],
            'temperature': habitat_result[1],
            'humidity': habitat_result[2]
        }

    return jsonify({
        'species_name': species.species_name,
        'food': species.food,
        'habitat': habitat_details
    })

# ORM — GET zoo details
@app.route('/zoos/<int:zoo_id>', methods=['GET'])
def get_zoo_details(zoo_id):
    zoo = Zoo.query.get(zoo_id)
    if zoo:
        return jsonify({
            'name': zoo.name,
            'location': zoo.location
        })
    else:
        return jsonify({'message': 'Zoo not found'}), 404

# ORM — GET employees at zoo
@app.route('/zoos/<int:zoo_id>/employees', methods=['GET'])
def get_employees(zoo_id):
    zoo = Zoo.query.get(zoo_id)
    if zoo is None:
        return jsonify({"error": "Zoo not found"}), 404

    employees = Employee.query.filter_by(zoo_id=zoo_id).all()
    return jsonify([{
        "emp_id": e.emp_id,
        "first_name": e.first_name,
        "last_name": e.last_name,
        "job_title": e.job_title,
        "job_description": e.job_description
    } for e in employees])

if __name__ == '__main__':
    app.run(debug=True)
