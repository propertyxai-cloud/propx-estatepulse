import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LocateFixed, MapPin, BookmarkPlus } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createSavedSearch, fetchProperties, formatCurrency } from '../lib/data';
import { useAuth } from '../context/AuthContext';

function distanceKm(a,b){
  const rad=(v)=>v*Math.PI/180;
  const dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);
  const haversine=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(haversine),Math.sqrt(1-haversine));
}

export default function MapSearch(){
  const {user}=useAuth();
  const [allProperties,setAllProperties]=useState([]);
  const [city,setCity]=useState('');
  const [countryCode,setCountryCode]=useState('');
  const [propertyType,setPropertyType]=useState('');
  const [radius,setRadius]=useState(25);
  const [center,setCenter]=useState(null);
  const [selected,setSelected]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const mapEl=useRef(null),mapRef=useRef(null),markersRef=useRef([]),radiusRef=useRef(null),centerRef=useRef(null);

  useEffect(()=>{
    let active=true;
    setLoading(true);setError('');
    fetchProperties({city:city||null,countryCode:countryCode||null,propertyType:propertyType||null,limit:100})
      .then((items)=>{if(active)setAllProperties(items.filter((item)=>Number.isFinite(Number(item.lat))&&Number.isFinite(Number(item.lng))));})
      .catch((err)=>{if(active)setError(err.message||'Could not load map listings.');})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[city,countryCode,propertyType]);

  const baseCenter=center || (allProperties[0]?{lat:Number(allProperties[0].lat),lng:Number(allProperties[0].lng)}:null);
  const properties=useMemo(()=>{
    if(!baseCenter)return allProperties;
    return allProperties.filter((property)=>distanceKm(baseCenter,{lat:Number(property.lat),lng:Number(property.lng)})<=Number(radius));
  },[allProperties,baseCenter?.lat,baseCenter?.lng,radius]);

  useEffect(()=>{
    if(!mapEl.current||mapRef.current)return;
    const map=L.map(mapEl.current,{scrollWheelZoom:false});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(map);
    mapRef.current=map;
    return ()=>{markersRef.current.forEach((m)=>m.remove());if(radiusRef.current)radiusRef.current.remove();map.remove();mapRef.current=null;};
  },[]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!map)return;
    const fallback=[0,0];
    const origin=baseCenter?[baseCenter.lat,baseCenter.lng]:(allProperties[0]?[allProperties[0].lat,allProperties[0].lng]:fallback);
    if(map.getZoom()<10||map.getCenter().lat===0)map.setView(origin,baseCenter?11:2);
    markersRef.current.forEach((marker)=>marker.remove());markersRef.current=[];
    properties.forEach((property)=>{
      const icon=L.divIcon({className:'',html:`<div class="map-pin ${selected===property.id?'selected':''}">P</div>`,iconSize:[26,26],iconAnchor:[13,26]});
      const marker=L.marker([Number(property.lat),Number(property.lng)],{icon}).addTo(map);
      marker.on('click',()=>setSelected(property.id));
      markersRef.current.push(marker);
    });
    if(radiusRef.current)radiusRef.current.remove();
    if(baseCenter){
      radiusRef.current=L.circle([baseCenter.lat,baseCenter.lng],{radius:Number(radius)*1000,color:'#0B835B',fillOpacity:0.04,weight:1}).addTo(map);
    }
    if(selected){
      const property=properties.find((item)=>item.id===selected);
      if(property)map.flyTo([Number(property.lat),Number(property.lng)],13);
    }
  },[properties,selected,baseCenter?.lat,baseCenter?.lng,radius,allProperties]);

  const locate=()=>{
    if(!navigator.geolocation){setError('Location services are not available in this browser.');return;}
    navigator.geolocation.getCurrentPosition((position)=>{
      setCenter({lat:position.coords.latitude,lng:position.coords.longitude});
      setSelected(null);mapRef.current?.flyTo([position.coords.latitude,position.coords.longitude],12);
      setNotice('Distance filter is now centred on your device location.');
    },(err)=>setError(err.message||'Your location could not be accessed.'),{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
  };

  const saveSearch=async()=>{
    if(!user){setNotice('Sign in to save this map search.');return;}
    try{
      await createSavedSearch(user.id,'Map search',{city,country_code:countryCode,property_type:propertyType,radius_km:radius,center});
      setNotice('Map search saved. Automated push/email alerts are not enabled by this action.');
    }catch(err){setError(err.message||'Could not save search.');}
  };

  return(
    <div className="container page-section">
      <div className="section-head-row"><div><h1><MapPin size={22}/> Map search</h1><p className="sub">Explore only approved active listings with published coordinates.</p></div><button className="btn btn-outline btn-sm" onClick={locate}><LocateFixed size={14}/> My location</button></div>
      <div className="map-filters">
        <label className="form-field"><span>Country code</span><input className="input" value={countryCode} maxLength={2} onChange={(e)=>setCountryCode(e.target.value.toUpperCase())} placeholder="e.g. PK"/></label>
        <label className="form-field"><span>City</span><input className="input" value={city} onChange={(e)=>setCity(e.target.value)} placeholder="Any city"/></label>
        <label className="form-field"><span>Property type</span><select className="input" value={propertyType} onChange={(e)=>setPropertyType(e.target.value)}><option value="">Any type</option>{['House','Apartment','Residential Plot','Farmhouse','Commercial','Office','Penthouse'].map((item)=><option key={item}>{item}</option>)}</select></label>
        <label className="form-field"><span>Radius: {radius} km</span><input type="range" min="2" max="100" value={radius} onChange={(e)=>setRadius(Number(e.target.value))}/></label>
        <button className="btn btn-outline btn-sm" onClick={saveSearch}><BookmarkPlus size={14}/> Save search</button>
      </div>
      {notice&&<div className="notice" role="status">{notice}</div>}
      {error&&<div className="form-error" role="alert">{error}</div>}
      <div className="results-head"><span>{loading?'Loading map listings…':`${properties.length} listings with coordinates in range`}</span></div>
      {!loading&&allProperties.length===0&&!error&&<div className="empty-inline">No approved listings with coordinates are available for these filters yet.</div>}
      <div className="map-layout">
        <div className="map-sidebar">
          {properties.map((property)=>(
            <div key={property.id} className="map-card-item" role="button" tabIndex={0} onClick={()=>{setSelected(property.id);mapRef.current?.flyTo([property.lat,property.lng],13);}} onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(property.id);}}}>
              {property.images?.[0]&&<img src={property.images[0]} alt={property.title}/>}
              <div><Link to={`/property/${property.id}`} className="mc-title">{property.title}</Link><div className="mc-meta">{formatCurrency(property.price,property.currency_code||property.currency||'USD')} · {property.property_type}</div><div className="mc-meta">{[property.city,property.country].filter(Boolean).join(', ')}</div></div>
            </div>
          ))}
        </div>
        <div className="map-area" ref={mapEl} aria-label="Map of approved PropertyX listings"/>
      </div>
    </div>
  );
}
