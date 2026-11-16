import { useEffect,useState } from 'react';
import { Info,TrendingUp,Globe2 } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { fetchProperties,formatCurrency } from '../lib/data';
import { COUNTRY_OPTIONS,CURRENCY_CODES } from '../lib/localeData';

export default function Investor(){
  const [filters,setFilters]=useState({
    countryCode:'',city:'',currencyCode:'',propertyType:'',
    minRoi:'',minYield:'',minPrice:'',maxPrice:'',investmentOnly:false,
  });
  const [properties,setProperties]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    let active=true;
    setLoading(true);setError('');
    const query={
      investmentOnly:filters.investmentOnly||undefined,
      minRoi:filters.minRoi?Number(filters.minRoi):undefined,
      minYield:filters.minYield?Number(filters.minYield):undefined,
      minPrice:filters.minPrice?Number(filters.minPrice):undefined,
      maxPrice:filters.maxPrice?Number(filters.maxPrice):undefined,
      countryCode:filters.countryCode||undefined,
      city:filters.city||undefined,
      currencyCode:filters.currencyCode||undefined,
      propertyType:filters.propertyType||undefined,
      limit:60,
    };
    if ((query.minPrice !== undefined || query.maxPrice !== undefined) && !filters.currencyCode) {
      setError('Choose a currency before entering an asking-price range. Currency conversion is not applied automatically.');
      setProperties([]);
      setLoading(false);
      return () => { active = false; };
    }
    if(query.minPrice!==undefined&&query.maxPrice!==undefined&&query.minPrice>query.maxPrice){
      setError('Minimum price cannot be greater than maximum price.');
      setProperties([]);setLoading(false);return()=>{active=false;};
    }
    if([filters.minRoi,filters.minYield].some((value)=>value!==''&&(!Number.isFinite(Number(value))||Number(value)<0||Number(value)>100))){
      setError('ROI and rental yield filters must be between 0 and 100.');
      setProperties([]);setLoading(false);return()=>{active=false;};
    }
    fetchProperties(query)
      .then((rows)=>{if(active)setProperties(rows);})
      .catch((err)=>{if(active){setProperties([]);setError(err.message||'Investment listing search is unavailable.');}})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[filters]);

  const change=(key,value)=>setFilters((old)=>({...old,[key]:value}));
  const currency=filters.currencyCode||'';

  return(
    <div className="container page-section">
      <h1><TrendingUp size={22} style={{color:'var(--color-primary)',verticalAlign:-4}}/> Investor property discovery</h1>
      <p className="sub" style={{marginTop:8}}>Find approved live properties with seller-supplied estimates. Price filters always use the selected listing currency; no automatic currency conversions or projected returns are invented.</p>
      <div className="notice"><Info size={16}/> Estimated ROI and rental yield are supplied with individual listings and may be incomplete or unverified. They are not independently confirmed performance, guaranteed income, or financial advice.</div>
      <div className="investor-filters">
        <label className="form-field"><span><Globe2 size={13}/> Country</span><select className="input" value={filters.countryCode} onChange={(e)=>change('countryCode',e.target.value)}><option value="">All countries</option>{COUNTRY_OPTIONS.map((option)=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="form-field"><span>City</span><input className="input" value={filters.city} onChange={(e)=>change('city',e.target.value)} placeholder="Any city"/></label>
        <label className="form-field"><span>Listing currency</span><select className="input" value={filters.currencyCode} onChange={(e)=>change('currencyCode',e.target.value)}><option value="">All currencies</option>{CURRENCY_CODES.map((code)=><option key={code} value={code}>{code}</option>)}</select></label>
        <label className="form-field"><span>Property type</span><select className="input" value={filters.propertyType} onChange={(e)=>change('propertyType',e.target.value)}><option value="">Any type</option>{['House','Apartment','Residential Plot','Farmhouse','Commercial','Office','Penthouse'].map((type)=><option key={type}>{type}</option>)}</select></label>
        <label className="form-field"><span>Minimum stated ROI (%)</span><input className="input" type="number" min="0" max="100" step="0.1" value={filters.minRoi} onChange={(e)=>change('minRoi',e.target.value)} placeholder="No minimum"/></label>
        <label className="form-field"><span>Minimum stated yield (%)</span><input className="input" type="number" min="0" max="100" step="0.1" value={filters.minYield} onChange={(e)=>change('minYield',e.target.value)} placeholder="No minimum"/></label>
        <label className="form-field"><span>Minimum asking price ({currency||'currency required'})</span><input className="input" type="number" min="0" step="any" value={filters.minPrice} onChange={(e)=>change('minPrice',e.target.value)} placeholder="No minimum"/></label>
        <label className="form-field"><span>Maximum asking price ({currency||'currency required'})</span><input className="input" type="number" min="0" step="any" value={filters.maxPrice} onChange={(e)=>change('maxPrice',e.target.value)} placeholder="No maximum"/></label>
        <label className="checkbox-label"><input type="checkbox" checked={filters.investmentOnly} onChange={(e)=>change('investmentOnly',e.target.checked)}/> Investment-tagged listings only</label>
        <button className="btn btn-outline btn-sm" type="button" onClick={()=>setFilters({countryCode:'',city:'',currencyCode:'',propertyType:'',minRoi:'',minYield:'',minPrice:'',maxPrice:'',investmentOnly:false})}>Reset filters</button>
      </div>
      <div className="results-head"><span className="results-count">{loading?'Searching…':`${properties.length} approved listing matches`}</span></div>
      {error&&<div className="form-error" role="alert">{error}</div>}
      {!loading&&!error&&properties.length===0&&<div className="empty-state"><TrendingUp size={30}/><h2>No matching investment listings</h2><p>Only listings with approved moderation status are searchable. ROI and yield filters need the seller to have supplied those fields.</p></div>}
      <div className="prop-grid cols-3">
        {properties.map((property)=>(
          <div key={property.id}>
            <PropertyCard property={property}/>
            {(property.est_roi!==null||property.est_yield!==null)&&<div className="roi-data-row">
              {property.est_yield!==null&&<span className="roi-badge">Stated yield <b>{property.est_yield}%</b></span>}
              {property.est_roi!==null&&<span className="roi-badge">Stated ROI <b>{property.est_roi}%</b></span>}
              <span className="roi-currency">{formatCurrency(property.price,property.currency_code||property.currency)}</span>
            </div>}
          </div>
        ))}
      </div>
    </div>
  );
}
