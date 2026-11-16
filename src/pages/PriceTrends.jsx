import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { fetchMarketSnapshots, formatCurrency, formatDate } from '../lib/data';

export default function PriceTrends(){
  const [countryCode,setCountryCode]=useState('PK');
  const [city,setCity]=useState('');
  const [currencyCode,setCurrencyCode]=useState('PKR');
  const [propertyType,setPropertyType]=useState('');
  const [snapshots,setSnapshots]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    let active=true;setLoading(true);setError('');
    fetchMarketSnapshots({countryCode:countryCode||null,city:city||null,currencyCode:currencyCode||null,propertyType:propertyType||null})
      .then((data)=>{if(active)setSnapshots(data);})
      .catch((err)=>{if(active){setSnapshots([]);setError(err.message||'Market data is unavailable.');}})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[countryCode,city,currencyCode,propertyType]);

  const chartData=snapshots.map((item)=>({
    month:formatDate(item.snapshot_month),
    median_price:Number(item.median_price),
    average_price:Number(item.average_price),
    listings:item.listing_count,
    snapshot_month:item.snapshot_month,
  }));
  const latest=chartData.at(-1);
  const previous=chartData.at(-2);
  const change=latest&&previous&&previous.median_price>0?((latest.median_price-previous.median_price)/previous.median_price*100):null;

  return(
    <div className="container page-section">
      <div className="section-head-row"><div><h1><BarChart3 size={24}/> Market price intelligence</h1><p className="sub">Monthly snapshot statistics calculated from approved live PropertyX listings. These are asking prices, not verified closed transactions.</p></div></div>
      <div className="market-filter-grid">
        <label className="form-field"><span>Country code</span><input className="input" value={countryCode} maxLength={2} onChange={(e)=>setCountryCode(e.target.value.toUpperCase())}/></label>
        <label className="form-field"><span>City</span><input className="input" value={city} onChange={(e)=>setCity(e.target.value)} placeholder="All cities"/></label>
        <label className="form-field"><span>Currency</span><input className="input" value={currencyCode} maxLength={3} onChange={(e)=>setCurrencyCode(e.target.value.toUpperCase())}/></label>
        <label className="form-field"><span>Property type</span><select className="input" value={propertyType} onChange={(e)=>setPropertyType(e.target.value)}><option value="">All types</option>{['House','Apartment','Residential Plot','Farmhouse','Commercial','Office','Penthouse'].map((item)=><option key={item}>{item}</option>)}</select></label>
      </div>
      {error&&<div className="form-error" role="alert">{error}</div>}
      {loading?<p className="empty-inline">Loading market snapshots…</p>:snapshots.length===0?(
        <div className="empty-state"><BarChart3 size={32}/><h2>Market history is being established</h2><p>PropertyX will begin plotting monthly asking-price snapshots once approved listings with valid country, city and currency data exist. No artificial historical prices or growth percentages are shown.</p></div>
      ):(
        <>
          <div className="dashboard-stats">
            <div className="dashboard-stat"><b>{latest?formatCurrency(latest.median_price,currencyCode):'—'}</b><span>Latest median asking price</span></div>
            <div className="dashboard-stat"><b>{latest?.listings??0}</b><span>Listings in latest snapshot</span></div>
            <div className="dashboard-stat"><b>{change===null?'—':`${change>=0?'+':''}${change.toFixed(1)}%`}</b><span>Change vs previous snapshot</span></div>
          </div>
          <div className="chart-card"><h2>Median asking price over time</h2><p>Each point is a monthly sample, grouped by country, city, currency and property type.</p>
            <ResponsiveContainer width="100%" height={360}>
              <AreaChart data={chartData} margin={{top:10,right:20,left:10,bottom:0}}>
                <defs><linearGradient id="marketMedian" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0B835B" stopOpacity={0.26}/><stop offset="95%" stopColor="#0B835B" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} tickFormatter={(value)=>new Intl.NumberFormat().format(value)}/>
                <Tooltip formatter={(value)=>formatCurrency(value,currencyCode)}/>
                <Area type="monotone" dataKey="median_price" name="Median asking price" stroke="#0B835B" fill="url(#marketMedian)" strokeWidth={2.5}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="dashboard-panel"><h2>Snapshot history</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>Month</th><th>Median</th><th>Average</th><th>Listings</th></tr></thead><tbody>{snapshots.map((item)=><tr key={item.snapshot_month}><td>{formatDate(item.snapshot_month)}</td><td>{formatCurrency(item.median_price,currencyCode)}</td><td>{formatCurrency(item.average_price,currencyCode)}</td><td>{item.listing_count}</td></tr>)}</tbody></table></div></div>
        </>
      )}
    </div>
  );
}
