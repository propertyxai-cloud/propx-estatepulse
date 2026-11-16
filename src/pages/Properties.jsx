import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookmarkPlus, Grid3X3, List, Map as MapIcon, Search, SlidersHorizontal } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { createSavedSearch, fetchPropertiesPage } from '../lib/data';
import { useAuth } from '../context/AuthContext';

const TYPES = ['All Types','House','Apartment','Residential Plot','Farmhouse','Commercial','Office','Penthouse'];
const PAGE_SIZE = 24;

export default function Properties() {
  const [params,setParams] = useSearchParams();
  const {user,profile} = useAuth();
  const [view,setView] = useState('grid');
  const [filters,setFilters] = useState({
    city: params.get('city') || '',
    country: params.get('country') || '',
    countryCode: params.get('country_code') || '',
    currencyCode: params.get('currency_code') || '',
    society: params.get('society') || '',
    propertyType: params.get('property_type') || 'All Types',
    beds: params.get('beds') || 'Any',
    minPrice: params.get('min_price') || '',
    maxPrice: params.get('max_price') || '',
    sort: 'newest',
    query: params.get('q') || '',
  });
  const [tab,setTab] = useState(params.get('type') || 'sale');
  const [queryText,setQueryText] = useState(params.get('q') || '');
  const [properties,setProperties] = useState([]);
  const [offset,setOffset] = useState(0);
  const [hasMore,setHasMore] = useState(false);
  const [loading,setLoading] = useState(true);
  const [loadingMore,setLoadingMore] = useState(false);
  const [error,setError] = useState('');
  const [savedMessage,setSavedMessage] = useState('');

  useEffect(()=>{
    setTab(params.get('type') || 'sale');
    setFilters((current)=>({
      ...current,
      city:params.get('city') || current.city,
      country:params.get('country') || current.country,
      society:params.get('society') || current.society,
      query:params.get('q') || current.query,
    }));
    setQueryText(params.get('q') || '');
  },[params]);

  const filterKey = useMemo(()=>JSON.stringify({...filters,tab}),[filters,tab]);

  useEffect(()=>{
    let active=true;
    setLoading(true);setError('');setOffset(0);
    if ((filters.minPrice || filters.maxPrice || filters.sort.startsWith('price_')) && !filters.currencyCode) {
      setProperties([]);
      setHasMore(false);
      setError('Select a three-letter currency before filtering or sorting by price. PropertyX does not compare different currencies as though they were the same.');
      setLoading(false);
      return () => { active = false; };
    }
    fetchPropertiesPage({
      ...filters,
      listingType:tab,
      city:filters.city || null,
      country:filters.country || null,
      countryCode:filters.countryCode || null,
      currencyCode:filters.currencyCode || null,
      society:filters.society || null,
      propertyType:filters.propertyType,
      minPrice:filters.minPrice || null,
      maxPrice:filters.maxPrice || null,
      sort:filters.sort,
      limit:PAGE_SIZE,
      offset:0,
    }).then((page)=>{
      if(!active)return;
      setProperties(page.items);setHasMore(page.hasMore);
    }).catch((err)=>{if(active){setProperties([]);setHasMore(false);setError(err.message || 'Search is unavailable.');}})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[filterKey]);

  const change=(key,value)=>setFilters((current)=>({...current,[key]:value}));

  const saveSearch=async()=>{
    if(!user){setSavedMessage('Sign in to save this search.');return;}
    try{
      const description=[filters.query,filters.city,filters.country].filter(Boolean).join(' · ');
      await createSavedSearch(user.id,description || 'Property search',{...filters,listingType:tab});
      setSavedMessage('Search saved to your account. Alerts depend on the notification service being configured.');
    }catch(err){setSavedMessage(err.message || 'Could not save this search.');}
  };

  const submitSearch=(event)=>{
    event.preventDefault();
    change('query',queryText);
    const next=new URLSearchParams(params);
    next.set('type',tab);
    if(queryText.trim())next.set('q',queryText.trim());else next.delete('q');
    setParams(next,{replace:true});
  };

  const loadMore=async()=>{
    setLoadingMore(true);setError('');
    try{
      const nextOffset=offset+PAGE_SIZE;
      const page=await fetchPropertiesPage({...filters,listingType:tab,city:filters.city||null,country:filters.country||null,
        countryCode:filters.countryCode||null,currencyCode:filters.currencyCode||null,society:filters.society||null,
        propertyType:filters.propertyType,minPrice:filters.minPrice||null,maxPrice:filters.maxPrice||null,
        sort:filters.sort,limit:PAGE_SIZE,offset:nextOffset});
      setProperties((current)=>[...current,...page.items]);setOffset(nextOffset);setHasMore(page.hasMore);
    }catch(err){setError(err.message || 'Could not load more listings.');}
    finally{setLoadingMore(false);}
  };

  return (
    <div className="container page-section">
      <div className="page-head"><h1>Property marketplace</h1><p className="sub">Search approved, active listings from every country and city represented in PropertyX.</p></div>
      <div className="tabs" style={{marginBottom:20}}>
        {['sale','rent','lease'].map((type)=><button key={type} className={`tab ${tab===type?'active':''}`} onClick={()=>setTab(type)}>{type==='sale'?'Buy':type==='rent'?'Rent':'Lease'}</button>)}
      </div>
      <form className="ai-search-bar" onSubmit={submitSearch}>
        <Search size={16}/>
        <input value={queryText} maxLength={100} onChange={(e)=>setQueryText(e.target.value)} placeholder="Search title, district, society or city…"/>
        <button className="btn btn-primary btn-sm" type="submit">Search</button>
        <button className="btn btn-outline btn-sm" type="button" onClick={saveSearch}><BookmarkPlus size={14}/> Save search</button>
      </form>
      {savedMessage && <div className="notice" role="status">{savedMessage}</div>}
      <div className="filters-layout">
        <aside className="filter-sidebar">
          <h4><SlidersHorizontal size={14}/> Refine results</h4>
          <label className="form-field"><span>Country name</span><input className="input" value={filters.country} onChange={(e)=>change('country',e.target.value)} placeholder="Any country"/></label>
          <label className="form-field"><span>Country code (ISO 3166-1 alpha-2)</span><input className="input" maxLength={2} value={filters.countryCode} onChange={(e)=>change('countryCode',e.target.value.toUpperCase())} placeholder="e.g. PK, AE"/></label>
          <label className="form-field"><span>City</span><input className="input" value={filters.city} onChange={(e)=>change('city',e.target.value)} placeholder="Any city"/></label>
          <label className="form-field"><span>Currency (ISO 4217)</span><input className="input" maxLength={3} value={filters.currencyCode} onChange={(e)=>change('currencyCode',e.target.value.toUpperCase())} placeholder="e.g. PKR, AED"/></label>
          <label className="form-field"><span>District / society</span><input className="input" value={filters.society} onChange={(e)=>change('society',e.target.value)} placeholder="Any society"/></label>
          <label className="form-field"><span>Property type</span><select className="input" value={filters.propertyType} onChange={(e)=>change('propertyType',e.target.value)}>{TYPES.map((type)=><option key={type}>{type}</option>)}</select></label>
          <label className="form-field"><span>Bedrooms</span><select className="input" value={filters.beds} onChange={(e)=>change('beds',e.target.value)}>{['Any','1','2','3','4','5','6','7'].map((value)=><option key={value} value={value}>{value==='Any'?'Any':`${value}+`}</option>)}</select></label>
          <div className="form-grid two">
            <label className="form-field"><span>Min price</span><input className="input" type="number" min="0" value={filters.minPrice} onChange={(e)=>change('minPrice',e.target.value)} /></label>
            <label className="form-field"><span>Max price</span><input className="input" type="number" min="0" value={filters.maxPrice} onChange={(e)=>change('maxPrice',e.target.value)} /></label>
          </div>
          <label className="form-field"><span>Sort</span><select className="input" value={filters.sort} onChange={(e)=>change('sort',e.target.value)}><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></label>
          <button className="btn btn-outline btn-sm" type="button" onClick={()=>setFilters({city:'',country:'',countryCode:'',currencyCode:'',society:'',propertyType:'All Types',beds:'Any',minPrice:'',maxPrice:'',sort:'newest',query:''})}>Reset filters</button>
        </aside>
        <main>
          <div className="section-head-row">
            <div><b>{loading?'Searching…':`${properties.length}${hasMore?'+':''} listings loaded`}</b><p className="sub">Only moderated, non-archived listings are returned.</p></div>
            <div className="view-toggle"><button className={view==='grid'?'active':''} onClick={()=>setView('grid')}><Grid3X3 size={14}/> Grid</button><button className={view==='list'?'active':''} onClick={()=>setView('list')}><List size={14}/> List</button><button className="active" onClick={()=>window.location.assign('/map-search')}><MapIcon size={14}/> Map</button></div>
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          {!loading && !error && properties.length===0 && <div className="empty-state"><Search size={30}/><h2>No approved listings found</h2><p>Broaden your filters or check again when new listings have passed moderation.</p></div>}
          <div className={`prop-grid ${view==='grid'?'cols-3':''} ${view==='list'?'list-view':''}`}>
            {properties.map((property)=><PropertyCard key={property.id} property={property} showActions/>)}
          </div>
          {hasMore && <div className="load-more"><button className="btn btn-outline" type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore?'Loading…':'Load more listings'}</button></div>}
        </main>
      </div>
    </div>
  );
}
