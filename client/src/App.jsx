import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [animals, setAnimals] = useState([]);
  const [speciesList, setSpeciesList] = useState([]);
  const [zooList, setZooList] = useState([]);
  const [form, setForm] = useState({
    animal_id: null,
    name: '',
    age: '',
    gender: '',
    species_name: '',
    zoo_id: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [selectedZoo, setSelectedZoo] = useState(null);
  const [selectedZooEmployees, setSelectedZooEmployees] = useState([]);

  const [filters, setFilters] = useState({
    species_name: '',
    minAge: '',
    maxAge: '',
    zoo_id: '',
    gender: '',
  });

  const [sortConfig, setSortConfig] = useState({
    sortBy: '',
    sortOrder: 'asc',
  });

  useEffect(() => {
    fetchAnimals();
    fetchSpecies();
    fetchZoos();
  }, []);

  useEffect(() => {
    fetchAnimals();
  }, [sortConfig]);

  const fetchAnimals = async () => {
    const res = await axios.get('http://localhost:5000/animals', {
      params: {
        species_name: filters.species_name,
        zoo_id: filters.zoo_id,
        minAge: filters.minAge,
        maxAge: filters.maxAge,
        gender: filters.gender,
        sort_by: sortConfig.sortBy,
        sort_order: sortConfig.sortOrder,
      },
    });
    setAnimals(res.data);
  };

  const fetchSpecies = async () => {
    const res = await axios.get('http://localhost:5000/species');
    setSpeciesList(res.data);
  };

  const fetchZoos = async () => {
    const res = await axios.get('http://localhost:5000/zoos');
    setZooList(res.data);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEditing) {
      await axios.put(`http://localhost:5000/animals/${form.animal_id}`, form);
    } else {
      await axios.post('http://localhost:5000/animals', form);
    }
    fetchAnimals();
    resetForm();
  };

  const handleEdit = (animal) => {
    setForm(animal);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    await axios.delete(`http://localhost:5000/animals/${id}`);
    fetchAnimals();
  };

  const resetForm = () => {
    setForm({
      animal_id: null,
      name: '',
      age: '',
      gender: '',
      species_name: '',
      zoo_id: '',
    });
    setIsEditing(false);
  };

  const handleSpeciesClick = async (speciesName) => {
    const res = await axios.get(`http://localhost:5000/species/${speciesName}`);
    setSelectedSpecies(res.data);
    setSelectedZoo(null);
    setSelectedZooEmployees([]);
  };

  const handleZooClick = async (zooId) => {
    const res = await axios.get(`http://localhost:5000/zoos/${zooId}`);
    setSelectedZoo(res.data);
    setSelectedSpecies(null);
    const employeesRes = await axios.get(`http://localhost:5000/zoos/${zooId}/employees`);
    setSelectedZooEmployees(employeesRes.data);
  };

  const handleSort = (field) => {
    const order =
      sortConfig.sortBy === field && sortConfig.sortOrder === 'asc' ? 'desc' : 'asc';
    setSortConfig({ sortBy: field, sortOrder: order });
  };

  const getSortArrow = (field) => {
    if (sortConfig.sortBy !== field) return '';
    return sortConfig.sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1, padding: '20px' }}>
        <h2>{isEditing ? 'Edit Animal' : 'Add New Animal'}</h2>
        <form onSubmit={handleSubmit}>
          <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
          <input name="age" type="number" placeholder="Age" value={form.age} onChange={handleChange} required />
          <select name="gender" value={form.gender} onChange={handleChange} required>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <select name="species_name" value={form.species_name} onChange={handleChange} required>
            <option value="">Select Species</option>
            {speciesList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select name="zoo_id" value={form.zoo_id} onChange={handleChange} required>
            <option value="">Select Zoo</option>
            {zooList.map((z) => (
              <option key={z.zoo_id} value={z.zoo_id}>{z.name}</option>
            ))}
          </select>
          <button type="submit">{isEditing ? 'Update' : 'Add'}</button>
          {isEditing && <button onClick={resetForm}>Cancel</button>}
        </form>

        <h3>Filters</h3>
        <div>
          <select name="species_name" value={filters.species_name} onChange={handleFilterChange}>
            <option value="">Filter by Species</option>
            {speciesList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select name="zoo_id" value={filters.zoo_id} onChange={handleFilterChange}>
            <option value="">Filter by Zoo</option>
            {zooList.map((z) => (
              <option key={z.zoo_id} value={z.zoo_id}>{z.name}</option>
            ))}
          </select>
          <input type="number" name="minAge" placeholder="Min Age" value={filters.minAge} onChange={handleFilterChange} />
          <input type="number" name="maxAge" placeholder="Max Age" value={filters.maxAge} onChange={handleFilterChange} />
          <select name="gender" value={filters.gender} onChange={handleFilterChange}>
            <option value="">Filter by Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <button onClick={fetchAnimals}>Apply Filters</button>
        </div>

        <h3>Animal List</h3>
        <table border="1" cellPadding="5" style={{ marginTop: '20px' }}>
          <thead>
            <tr>
              <th onClick={() => handleSort('animal_id')}>ID {getSortArrow('animal_id')}</th>
              <th onClick={() => handleSort('name')}>Name {getSortArrow('name')}</th>
              <th onClick={() => handleSort('age')}>Age {getSortArrow('age')}</th>
              <th onClick={() => handleSort('gender')}>Gender {getSortArrow('gender')}</th>
              <th onClick={() => handleSort('species_name')}>Species {getSortArrow('species_name')}</th>
              <th onClick={() => handleSort('zoo_id')}>Zoo {getSortArrow('zoo_id')}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {animals.map((animal) => (
              <tr key={animal.animal_id}>
                <td>{animal.animal_id}</td>
                <td>{animal.name}</td>
                <td>{animal.age}</td>
                <td>{animal.gender}</td>
                <td
                  onClick={() => handleSpeciesClick(animal.species_name)}
                  style={{ cursor: 'pointer', color: 'blue' }}
                >
                  {animal.species_name}
                </td>
                <td
                  onClick={() => handleZooClick(animal.zoo_id)}
                  style={{ cursor: 'pointer', color: 'blue' }}
                >
                  {animal.zoo_name}
                </td>
                <td>
                  <button onClick={() => handleEdit(animal)}>Edit</button>
                  <button onClick={() => handleDelete(animal.animal_id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ flex: 1, padding: '20px', borderLeft: '2px solid #ccc' }}>
        <h3>
          {selectedSpecies
            ? 'Species Details'
            : selectedZoo
            ? 'Zoo Details'
            : 'Click a species or zoo for more details'}
        </h3>

        {selectedSpecies && (
          <div>
            <p><strong>Species Name:</strong> {selectedSpecies.species_name}</p>
            <p><strong>Food:</strong> {selectedSpecies.food}</p>
            {selectedSpecies.habitat && (
              <div>
                <p><strong>Habitat:</strong> {selectedSpecies.habitat.habitat}</p>
                <p><strong>Temperature:</strong> {selectedSpecies.habitat.temperature}°C</p>
                <p><strong>Humidity:</strong> {selectedSpecies.habitat.humidity}%</p>
              </div>
            )}
          </div>
        )}

        {selectedZoo && (
          <div>
            <p><strong>Zoo Name:</strong> {selectedZoo.name}</p>
            <p><strong>Location:</strong> {selectedZoo.location}</p>
          </div>
        )}

        {selectedZooEmployees.length > 0 && (
          <div>
            <h4>Employees Working at {selectedZoo.name}</h4>
            <ul>
              {selectedZooEmployees.map((employee) => (
                <li key={employee.emp_id}>
                  <p><strong>Name:</strong> {employee.first_name} {employee.last_name}</p>
                  <p><strong>Job Title:</strong> {employee.job_title}</p>
                  <p><strong>Job Description:</strong> {employee.job_description}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
