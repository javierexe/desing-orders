import { useEffect, useState } from "react";

const API = "http://localhost:8000";

export default function App() {
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({
    code: "",
    client_name: "",
    title: "",
    delivery_method: "retiro", // retiro | despacho
    due_date: "",               // yyyy-mm-dd
    description: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchOrders() {
    const res = await fetch(`${API}/orders/`);
    const data = await res.json();
    setOrders(data);
  }

  useEffect(() => { fetchOrders(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/orders/`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await fetchOrders();
      setForm({ code:"", client_name:"", title:"", delivery_method:"retiro", due_date:"", description:"" });
    } catch (err) {
      setError(err.message || "Error al crear el pedido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{fontFamily:"Inter, system-ui", padding:16, maxWidth:980, margin:"0 auto"}}>
      <h1>Design Orders</h1>

      <section style={{marginTop:16, padding:12, border:"1px solid #ddd", borderRadius:8}}>
        <h2 style={{marginTop:0}}>Nuevo pedido</h2>
        <form onSubmit={handleSubmit} style={{display:"grid", gap:8, gridTemplateColumns:"1fr 1fr"}}>
          <label>Code
            <input required value={form.code}
              onChange={e=>setForm({...form, code:e.target.value})} />
          </label>
          <label>Cliente
            <input required value={form.client_name}
              onChange={e=>setForm({...form, client_name:e.target.value})} />
          </label>
          <label>Título
            <input required value={form.title}
              onChange={e=>setForm({...form, title:e.target.value})} />
          </label>
          <label>Método de entrega
            <select value={form.delivery_method}
              onChange={e=>setForm({...form, delivery_method:e.target.value})}>
              <option value="retiro">retiro</option>
              <option value="despacho">despacho</option>
            </select>
          </label>
          <label>Fecha compromiso
            <input type="date" value={form.due_date}
              onChange={e=>setForm({...form, due_date:e.target.value})} />
          </label>
          <label style={{gridColumn:"1 / -1"}}>Descripción
            <textarea rows={3} value={form.description}
              onChange={e=>setForm({...form, description:e.target.value})} />
          </label>
          <div style={{gridColumn:"1 / -1", display:"flex", gap:8}}>
            <button disabled={loading} type="submit">Crear</button>
            {loading && <span>Guardando…</span>}
            {error && <span style={{color:"tomato"}}>{error}</span>}
          </div>
        </form>
      </section>

      <section style={{marginTop:24}}>
        <h2 style={{marginTop:0}}>Pedidos</h2>
        <div style={{display:"grid", gap:8}}>
          {orders.length === 0 && <div>No hay pedidos aún.</div>}
          {orders.map(o => (
            <article key={o.code} style={{border:"1px solid #eee", borderRadius:8, padding:12}}>
              <div style={{fontWeight:600}}>{o.title} <small style={{color:"#666"}}>({o.code})</small></div>
              <div style={{fontSize:14, color:"#444"}}>{o.client_name} · {o.delivery_method}</div>
              {o.due_date && <div style={{fontSize:13}}>Vence: {o.due_date}</div>}
              <div style={{fontSize:12, color:"#666"}}>Estado: {o.status}</div>
              {o.description && <div style={{marginTop:6}}>{o.description}</div>}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

