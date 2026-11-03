import { useEffect, useState } from 'react';
import './App.css';
import { supabase } from './supabase';

const emptyMedicine = {
  generic_name: '',
  brand_names: '',
  formulation: '',
  strength: '',
  published: false,
};

const emptyRule = {
  medicine_id: '',
  indication: '',
  age_min_days: '',
  age_max_days: '',
  dose_value: '',
  dose_basis: 'mg/kg/dose',
  frequency_per_day: '',
  max_single_mg: '',
  max_daily_mg: '',
  concentration_mg_per_ml: '',
  duration: '',
  route: '',
  reference: '',
  review_status: 'pending',
};

const styles = {
  app: {
    fontFamily: 'Arial, sans-serif',
    background: '#f3f6fa',
    minHeight: '100vh',
    color: '#183047',
  },
  header: {
    background: '#075985',
    color: 'white',
    padding: 22,
    textAlign: 'center',
  },
  main: {
    maxWidth: 850,
    margin: 'auto',
    padding: 18,
  },
  panel: {
    background: 'white',
    padding: 18,
    margin: '18px 0',
    borderRadius: 12,
    boxShadow: '0 2px 8px #00000010',
  },
  input: {
    width: '100%',
    padding: 11,
    margin: '7px 0 12px',
    border: '1px solid #ccd5df',
    borderRadius: 7,
    boxSizing: 'border-box',
  },
  button: {
    background: '#087e8b',
    color: 'white',
    border: 0,
    borderRadius: 7,
    padding: '10px 15px',
    margin: '5px',
    cursor: 'pointer',
  },
  item: {
    background: '#f1f5f9',
    padding: 13,
    borderRadius: 8,
    margin: '10px 0',
  },
  footer: {
    textAlign: 'center',
    padding: 20,
    color: '#64748b',
    fontSize: 13,
  },
};

function App() {
  const [medicines, setMedicines] = useState([]);
  const [rules, setRules] = useState([]);
  const [search, setSearch] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('');

  const [medicineForm, setMedicineForm] = useState(emptyMedicine);
  const [ruleForm, setRuleForm] = useState(emptyRule);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [editingRule, setEditingRule] = useState(null);

  useEffect(() => {
    loadPublicData();
    checkUser();
  }, []);

  async function loadPublicData() {
    const { data: meds, error: medError } = await supabase
      .from('medicines')
      .select('*')
      .eq('published', true)
      .order('generic_name');

    const { data: doseRules, error: ruleError } = await supabase
      .from('dose_rules')
      .select('*')
      .eq('review_status', 'verified');

    if (medError || ruleError) {
      setMessage('Could not load public medicine data.');
      return;
    }

    setMedicines(meds || []);
    setRules(doseRules || []);
  }

  async function loadAdminData() {
    const { data: meds, error: medError } = await supabase
      .from('medicines')
      .select('*')
      .order('generic_name');

    const { data: doseRules, error: ruleError } = await supabase
      .from('dose_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (medError || ruleError) {
      setMessage('Admin data loading failed. Check permissions.');
      return;
    }

    setMedicines(meds || []);
    setRules(doseRules || []);
  }

  async function checkUser() {
    const { data } = await supabase.auth.getSession();
    const currentUser = data.session?.user;

    if (!currentUser) {
      setUser(null);
      setIsAdmin(false);
      return;
    }

    setUser(currentUser);

    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    const allowed = !error && Boolean(admin);
    setIsAdmin(allowed);

    if (allowed) {
      await loadAdminData();
    }
  }

  async function login(e) {
    e.preventDefault();
    setMessage('Logging in...');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    await checkUser();
    setMessage('Login successful.');
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setSelectedMedicine(null);
    setMessage('Logged out.');
    await loadPublicData();
  }

  async function refreshData() {
    if (isAdmin) {
      await loadAdminData();
    } else {
      await loadPublicData();
    }
  }

  async function saveMedicine(e) {
    e.preventDefault();

    if (!isAdmin) return;

    const payload = {
      generic_name: medicineForm.generic_name.trim(),
      brand_names: medicineForm.brand_names
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      formulation: medicineForm.formulation.trim(),
      strength: medicineForm.strength.trim(),
      published: medicineForm.published,
    };

    const result = editingMedicine
      ? await supabase
          .from('medicines')
          .update(payload)
          .eq('id', editingMedicine)
      : await supabase.from('medicines').insert(payload);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setMedicineForm(emptyMedicine);
    setEditingMedicine(null);
    setMessage('Medicine saved successfully.');
    await loadAdminData();
  }

  async function saveRule(e) {
    e.preventDefault();

    if (!isAdmin) return;

    const optionalNumber = (value) => (value === '' ? null : Number(value));

    const payload = {
      medicine_id: ruleForm.medicine_id,
      indication: ruleForm.indication.trim(),
      age_min_days: Number(ruleForm.age_min_days),
      age_max_days: Number(ruleForm.age_max_days),
      dose_value: Number(ruleForm.dose_value),
      dose_basis: ruleForm.dose_basis,
      frequency_per_day: Number(ruleForm.frequency_per_day),
      max_single_mg: optionalNumber(ruleForm.max_single_mg),
      max_daily_mg: optionalNumber(ruleForm.max_daily_mg),
      concentration_mg_per_ml: optionalNumber(ruleForm.concentration_mg_per_ml),
      duration: ruleForm.duration.trim(),
      route: ruleForm.route.trim(),
      reference: ruleForm.reference.trim(),
      review_status: ruleForm.review_status,
    };

    if (
      !payload.medicine_id ||
      !payload.indication ||
      !payload.reference ||
      !Number.isFinite(payload.dose_value) ||
      payload.dose_value <= 0 ||
      payload.age_min_days < 0 ||
      payload.age_max_days < payload.age_min_days ||
      payload.frequency_per_day <= 0
    ) {
      setMessage('Please check the dose rule fields.');
      return;
    }

    const result = editingRule
      ? await supabase.from('dose_rules').update(payload).eq('id', editingRule)
      : await supabase.from('dose_rules').insert(payload);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setRuleForm(emptyRule);
    setEditingRule(null);
    setMessage('Dose rule saved successfully.');
    await loadAdminData();
  }

  async function deleteMedicine(id) {
    if (!isAdmin) return;

    if (!window.confirm('Delete this medicine?')) return;

    const { error } = await supabase.from('medicines').delete().eq('id', id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Medicine deleted.');
    await loadAdminData();
  }

  async function deleteRule(id) {
    if (!isAdmin) return;

    if (!window.confirm('Delete this dose rule?')) return;

    const { error } = await supabase.from('dose_rules').delete().eq('id', id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Dose rule deleted.');
    await loadAdminData();
  }

  function editMedicine(m) {
    setEditingMedicine(m.id);
    setMedicineForm({
      generic_name: m.generic_name || '',
      brand_names: Array.isArray(m.brand_names) ? m.brand_names.join(', ') : '',
      formulation: m.formulation || '',
      strength: m.strength || '',
      published: Boolean(m.published),
    });
  }

  function editRule(r) {
    setEditingRule(r.id);
    setRuleForm({
      medicine_id: r.medicine_id || '',
      indication: r.indication || '',
      age_min_days: r.age_min_days ?? '',
      age_max_days: r.age_max_days ?? '',
      dose_value: r.dose_value ?? '',
      dose_basis: r.dose_basis || 'mg/kg/dose',
      frequency_per_day: r.frequency_per_day ?? '',
      max_single_mg: r.max_single_mg ?? '',
      max_daily_mg: r.max_daily_mg ?? '',
      concentration_mg_per_ml: r.concentration_mg_per_ml ?? '',
      duration: r.duration || '',
      route: r.route || '',
      reference: r.reference || '',
      review_status: r.review_status || 'pending',
    });
  }

  function calculateDose(rule) {
    const kg = Number(weight);
    const ageDays = Number(age);

    if (!weight || !age || kg <= 0 || ageDays < 0) {
      return { error: 'Enter valid age in days and weight in kg.' };
    }

    if (
      ageDays < Number(rule.age_min_days) ||
      ageDays > Number(rule.age_max_days)
    ) {
      return { error: "Age is outside this rule's range." };
    }

    const dose = Number(rule.dose_value);
    const frequency = Number(rule.frequency_per_day);
    const basis = (rule.dose_basis || '').toLowerCase().replace(/\s/g, '');

    let mg;

    if (basis === 'mg/kg/dose') {
      mg = dose * kg;
    } else if (basis === 'mg/kg/day') {
      mg = (dose * kg) / frequency;
    } else if (basis === 'mg/dose') {
      mg = dose;
    } else if (basis === 'mg/day') {
      mg = dose / frequency;
    } else {
      return {
        error: 'Unsupported dose basis. Manual clinical verification required.',
      };
    }

    if (rule.max_single_mg !== null && mg > Number(rule.max_single_mg)) {
      return {
        error:
          'Calculated dose exceeds maximum single dose. Do not use this result.',
      };
    }

    if (
      rule.max_daily_mg !== null &&
      mg * frequency > Number(rule.max_daily_mg)
    ) {
      return {
        error:
          'Calculated dose exceeds maximum daily dose. Do not use this result.',
      };
    }

    const volume = rule.concentration_mg_per_ml
      ? mg / Number(rule.concentration_mg_per_ml)
      : null;

    return { mg, volume };
  }

  const filteredMedicines = medicines.filter((m) => {
    const brands = Array.isArray(m.brand_names) ? m.brand_names.join(' ') : '';

    return `${m.generic_name} ${brands}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const selectedRules = selectedMedicine
    ? rules.filter((r) => {
        return (
          r.medicine_id === selectedMedicine.id &&
          age !== '' &&
          Number(age) >= Number(r.age_min_days) &&
          Number(age) <= Number(r.age_max_days)
        );
      })
    : [];

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1>💊 MediDose BD</h1>
        <p>Medicine & Dose Reference</p>
      </header>

      <main style={styles.main}>
        <section style={styles.panel}>
          <h2>Medicine Search</h2>

          <input
            style={styles.input}
            placeholder="Search generic or brand name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {filteredMedicines.map((m) => (
            <div key={m.id} style={styles.item}>
              <strong>{m.generic_name}</strong>
              <p>
                {Array.isArray(m.brand_names) ? m.brand_names.join(', ') : ''}
              </p>
              <p>
                {m.formulation} | {m.strength}
              </p>
              <button
                style={styles.button}
                onClick={() => setSelectedMedicine(m)}
              >
                View Medicine
              </button>
            </div>
          ))}

          {filteredMedicines.length === 0 && (
            <p>No published medicine found.</p>
          )}
        </section>

        {selectedMedicine && (
          <section style={styles.panel}>
            <h2>{selectedMedicine.generic_name}</h2>
            <p>
              {selectedMedicine.formulation} | {selectedMedicine.strength}
            </p>

            <label>Patient age (days)</label>
            <input
              style={styles.input}
              type="number"
              min="0"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter age in days"
            />

            <label>Patient weight (kg)</label>
            <input
              style={styles.input}
              type="number"
              min="0.01"
              step="any"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Enter weight in kg"
            />

            <h3>Verified Dose Rules</h3>

            {selectedRules.length === 0 && (
              <p>No verified rule found for this age.</p>
            )}

            {selectedRules.map((r) => {
              const result = calculateDose(r);

              return (
                <div key={r.id} style={styles.item}>
                  <strong>Indication:</strong> {r.indication}
                  <p>
                    Dose: {r.dose_value} {r.dose_basis}
                  </p>
                  <p>Route: {r.route}</p>
                  <p>Frequency/day: {r.frequency_per_day}</p>
                  <p>Duration: {r.duration}</p>
                  <p>Reference: {r.reference}</p>
                  {result.error && (
                    <p style={{ color: 'red' }}>{result.error}</p>
                  )}
                  {result.mg !== undefined && (
                    <p>
                      Calculated amount:{' '}
                      <strong>{result.mg.toFixed(2)} mg per dose</strong>
                      {result.volume !== null &&
                        ` (${result.volume.toFixed(2)} mL per dose)`}
                    </p>
                  )}
                </div>
              );
            })}

            <button
              style={styles.button}
              onClick={() => setSelectedMedicine(null)}
            >
              Close
            </button>
          </section>
        )}

        <section style={styles.panel}>
          <h2>Admin Login</h2>

          {!user ? (
            <form onSubmit={login}>
              <input
                style={styles.input}
                type="email"
                placeholder="Admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                style={styles.input}
                type="password"
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button style={styles.button} type="submit">
                Login
              </button>
            </form>
          ) : (
            <>
              <p>
                {isAdmin ? 'Admin access verified.' : 'You are not an admin.'}
              </p>
              <button style={styles.button} onClick={logout}>
                Logout
              </button>
            </>
          )}

          <p>{message}</p>
        </section>

        {user && isAdmin && (
          <section style={styles.panel}>
            <h2>Admin Dashboard</h2>

            <h3>{editingMedicine ? 'Edit Medicine' : 'Add Medicine'}</h3>

            <form onSubmit={saveMedicine}>
              <input
                style={styles.input}
                placeholder="Generic name"
                required
                value={medicineForm.generic_name}
                onChange={(e) =>
                  setMedicineForm({
                    ...medicineForm,
                    generic_name: e.target.value,
                  })
                }
              />

              <input
                style={styles.input}
                placeholder="Brand names (comma separated)"
                value={medicineForm.brand_names}
                onChange={(e) =>
                  setMedicineForm({
                    ...medicineForm,
                    brand_names: e.target.value,
                  })
                }
              />

              <input
                style={styles.input}
                placeholder="Formulation"
                value={medicineForm.formulation}
                onChange={(e) =>
                  setMedicineForm({
                    ...medicineForm,
                    formulation: e.target.value,
                  })
                }
              />

              <input
                style={styles.input}
                placeholder="Strength"
                value={medicineForm.strength}
                onChange={(e) =>
                  setMedicineForm({
                    ...medicineForm,
                    strength: e.target.value,
                  })
                }
              />

              <label>
                <input
                  type="checkbox"
                  checked={medicineForm.published}
                  onChange={(e) =>
                    setMedicineForm({
                      ...medicineForm,
                      published: e.target.checked,
                    })
                  }
                />
                Publish medicine
              </label>

              <br />

              <button style={styles.button} type="submit">
                Save Medicine
              </button>

              {editingMedicine && (
                <button
                  style={styles.button}
                  type="button"
                  onClick={() => {
                    setEditingMedicine(null);
                    setMedicineForm(emptyMedicine);
                  }}
                >
                  Cancel
                </button>
              )}
            </form>

            <h3>Medicine List</h3>

            {medicines.map((m) => (
              <div key={m.id} style={styles.item}>
                <strong>{m.generic_name}</strong>
                <p>{m.published ? 'Published' : 'Draft'}</p>
                <button style={styles.button} onClick={() => editMedicine(m)}>
                  Edit
                </button>
                <button
                  style={styles.button}
                  onClick={() => deleteMedicine(m.id)}
                >
                  Delete
                </button>
              </div>
            ))}

            <hr />

            <h3>{editingRule ? 'Edit Dose Rule' : 'Add Dose Rule'}</h3>

            <form onSubmit={saveRule}>
              <select
                style={styles.input}
                required
                value={ruleForm.medicine_id}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    medicine_id: e.target.value,
                  })
                }
              >
                <option value="">Select medicine</option>
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.generic_name}
                  </option>
                ))}
              </select>

              <input
                style={styles.input}
                placeholder="Indication"
                required
                value={ruleForm.indication}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, indication: e.target.value })
                }
              />

              <input
                style={styles.input}
                type="number"
                min="0"
                placeholder="Minimum age in days"
                required
                value={ruleForm.age_min_days}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, age_min_days: e.target.value })
                }
              />

              <input
                style={styles.input}
                type="number"
                min="0"
                placeholder="Maximum age in days"
                required
                value={ruleForm.age_max_days}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, age_max_days: e.target.value })
                }
              />

              <input
                style={styles.input}
                type="number"
                min="0"
                step="any"
                placeholder="Dose value"
                required
                value={ruleForm.dose_value}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, dose_value: e.target.value })
                }
              />

              <select
                style={styles.input}
                value={ruleForm.dose_basis}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, dose_basis: e.target.value })
                }
              >
                <option value="mg/kg/dose">mg/kg/dose</option>
                <option value="mg/kg/day">mg/kg/day</option>
                <option value="mg/dose">mg/dose</option>
                <option value="mg/day">mg/day</option>
              </select>

              <input
                style={styles.input}
                type="number"
                min="1"
                placeholder="Frequency per day"
                required
                value={ruleForm.frequency_per_day}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    frequency_per_day: e.target.value,
                  })
                }
              />

              <input
                style={styles.input}
                type="number"
                min="0"
                step="any"
                placeholder="Maximum single dose (mg)"
                value={ruleForm.max_single_mg}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    max_single_mg: e.target.value,
                  })
                }
              />

              <input
                style={styles.input}
                type="number"
                min="0"
                step="any"
                placeholder="Maximum daily dose (mg)"
                value={ruleForm.max_daily_mg}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    max_daily_mg: e.target.value,
                  })
                }
              />

              <input
                style={styles.input}
                type="number"
                min="0"
                step="any"
                placeholder="Concentration (mg/mL)"
                value={ruleForm.concentration_mg_per_ml}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    concentration_mg_per_ml: e.target.value,
                  })
                }
              />

              <input
                style={styles.input}
                placeholder="Route"
                value={ruleForm.route}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, route: e.target.value })
                }
              />

              <input
                style={styles.input}
                placeholder="Duration"
                value={ruleForm.duration}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, duration: e.target.value })
                }
              />

              <input
                style={styles.input}
                placeholder="Reference"
                required
                value={ruleForm.reference}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, reference: e.target.value })
                }
              />

              <select
                style={styles.input}
                value={ruleForm.review_status}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    review_status: e.target.value,
                  })
                }
              >
                <option value="needs_review">Pending review</option>
                <option value="verified">Verified</option>
              </select>

              <button style={styles.button} type="submit">
                Save Dose Rule
              </button>

              {editingRule && (
                <button
                  style={styles.button}
                  type="button"
                  onClick={() => {
                    setEditingRule(null);
                    setRuleForm(emptyRule);
                  }}
                >
                  Cancel
                </button>
              )}
            </form>

            <h3>Dose Rule List</h3>

            {rules.map((r) => (
              <div key={r.id} style={styles.item}>
                <strong>{r.indication}</strong>
                <p>Status: {r.review_status}</p>
                <button style={styles.button} onClick={() => editRule(r)}>
                  Edit
                </button>
                <button style={styles.button} onClick={() => deleteRule(r.id)}>
                  Delete
                </button>
              </div>
            ))}
          </section>
        )}
      </main>

      <footer style={styles.footer}>
        Educational reference only. Verify all doses with authoritative
        references and a qualified clinician before clinical use.
      </footer>
    </div>
  );
}

export default App;
