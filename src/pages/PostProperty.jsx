import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createProperty, uploadPropertyImages, removeUploadedImages } from '../lib/data';
import { validatePropertyDraft } from '../lib/validation';
import { COUNTRY_OPTIONS,CURRENCY_CODES,TIME_ZONE_OPTIONS,defaultCurrencyForCountry,defaultTimezoneForCountry,getCountryName } from '../lib/localeData';

const INITIAL={
  title:'',listing_type:'sale',property_type:'House',price:'',currency_code:'USD',
  country:'',country_code:'',region:'',city:'',city_code:'',postal_code:'',
  timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',
  society:'',address:'',location:'',area:'',area_unit:'sq ft',
  sqft:'',beds:'',baths:'',description:'',features:'',lat:'',lng:'',
};

export default function PostProperty(){
  const {user,profile}=useAuth();
  const navigate=useNavigate();
  const [form,setForm]=useState(()=>({...INITIAL,
    country_code:profile?.preferred_country_code||'',
    country:getCountryName(profile?.preferred_country_code),
    currency_code:profile?.preferred_currency_code||'USD',
    timezone:profile?.preferred_timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',
  }));
  const [photos,setPhotos]=useState([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [created,setCreated]=useState(null);
  const update=(key,value)=>setForm((previous)=>({...previous,[key]:value}));

  const submit=async(event)=>{
    event.preventDefault();setBusy(true);setError('');
    let uploads=[];
    try{
      const validation=validatePropertyDraft(form);
      if(validation)throw new Error(validation);
      uploads=await uploadPropertyImages(photos,user.id);
      const payload={...form,features:form.features.split(',').map((item)=>item.trim()).filter(Boolean).slice(0,30)};
      const property=await createProperty(payload,user,profile,uploads.map((item)=>item.url));
      setCreated(property);setForm(INITIAL);setPhotos([]);
    }catch(err){
      if(uploads.length){
        try{await removeUploadedImages(uploads.map((item)=>item.path));}
        catch(cleanupError){console.warn('Unable to remove orphaned upload:',cleanupError);}
      }
      setError(err.message||'Could not submit your listing.');
    }finally{setBusy(false);}
  };

  if(created)return(
    <div className="container page-section"><div className="success-panel">
      <CheckCircle2 size={38}/><h1>Listing submitted for review</h1>
      <p>Your property “{created.title}” is recorded as {created.moderation_status}. It will appear publicly only after an administrator approves it.</p>
      <button className="btn btn-primary" onClick={()=>navigate('/agent-portal')}>Open my dashboard</button>
      <button className="btn btn-outline" onClick={()=>setCreated(null)}>Post another property</button>
    </div></div>
  );

  const field=(key,label,options={})=>(
    <label className="form-field"><span>{label}{options.required?' *':''}</span>
      {options.options?<select className="input" required={options.required} value={form[key]} onChange={(event)=>update(key,event.target.value)}>{options.options.map((item)=><option key={item.value??item} value={item.value??item}>{item.label??item}</option>)}</select>
      :<input className="input" required={options.required} type={options.type||'text'} min={options.min} max={options.max} step={options.step} maxLength={options.maxLength} value={form[key]} onChange={(event)=>update(key,event.target.value)}/>}
    </label>
  );

  return(
    <div className="container page-section narrow">
      <div className="page-head"><h1><UploadCloud size={24}/> Post a property</h1><p className="sub">Accurate details help buyers make informed decisions. All submissions are moderated.</p></div>
      <form className="listing-form" onSubmit={submit}>
        <h2>Listing information</h2>
        {field('title','Property title',{required:true,maxLength:200})}
        <div className="form-grid two">
          {field('listing_type','Offer type',{required:true,options:['sale','rent','lease']})}
          {field('property_type','Property type',{required:true,options:['House','Apartment','Residential Plot','Farmhouse','Commercial','Office','Penthouse']})}
          {field('price','Asking price',{required:true,type:'number',min:'1',step:'any'})}
          {field('currency_code','Listing currency (ISO 4217)',{required:true,options:CURRENCY_CODES})}
          {field('area','Area',{type:'number',min:'0',step:'any'})}
          {field('area_unit','Area unit',{options:['sq ft','sq yd','sq m','Marla','Kanal','Acre','Hectare']})}
          {field('beds','Bedrooms',{type:'number',min:'0',max:'100',step:'1'})}
          {field('baths','Bathrooms',{type:'number',min:'0',max:'100',step:'1'})}
        </div>
        <h2>Global location</h2>
        <div className="form-grid two">
          <label className="form-field"><span>Country *</span><select className="input" required value={form.country_code} onChange={(event)=>{
            const code=event.target.value;
            setForm((old)=>({...old,country_code:code,country:getCountryName(code),currency_code:defaultCurrencyForCountry(code)||old.currency_code,timezone:defaultTimezoneForCountry(code)||old.timezone}));
          }}><option value="">Choose a country</option>{COUNTRY_OPTIONS.map((option)=><option key={option.value} value={option.value}>{option.label} ({option.value})</option>)}</select></label>
          {field('region','State / region',{maxLength:100})}
          {field('city','City',{required:true,maxLength:120})}
          {field('city_code','City code',{maxLength:100})}
          {field('postal_code','Postal code',{maxLength:30})}
          {field('timezone','Property timezone (IANA)',{required:true,options:TIME_ZONE_OPTIONS})}
          {field('society','Society / district',{maxLength:160})}
        </div>
        {field('address','Street address',{maxLength:300})}
        {field('location','Public display location',{maxLength:300})}
        <div className="form-grid two">{field('lat','Latitude',{type:'number',min:'-90',max:'90',step:'any'})}{field('lng','Longitude',{type:'number',min:'-180',max:'180',step:'any'})}</div>
        <h2>Details and photographs</h2>
        <label className="form-field"><span>Description</span><textarea className="input" rows={6} maxLength={10000} value={form.description} onChange={(event)=>update('description',event.target.value)} placeholder="Describe the property using facts you can verify."/></label>
        <label className="form-field"><span>Features (comma separated)</span><input className="input" value={form.features} onChange={(event)=>update('features',event.target.value)} placeholder="Parking, lift, balcony"/></label>
        <label className="form-field"><span><Camera size={15}/> Property photographs (up to 8, JPG/PNG/WebP/AVIF, max 15 MB each)</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event)=>setPhotos(Array.from(event.target.files||[]).slice(0,8))}/>{photos.length>0&&<small>{photos.length} photo(s) selected.</small>}</label>
        <div className="notice">Do not upload identity documents, payment details or images you do not have permission to use. Ownership verification is performed by PropertyX moderators, not by the seller.</div>
        {error&&<div className="form-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy?'Submitting…':'Submit for review'}</button>
      </form>
    </div>
  );
}
