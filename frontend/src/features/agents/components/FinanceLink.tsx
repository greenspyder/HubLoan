import {useSearchParams} from 'react-router-dom';
import type {ReactNode} from 'react';
export function FinanceLink({section,campaign,children}:{section:string;campaign?:string;children:ReactNode}){
 const [params,setParams]=useSearchParams();const next=new URLSearchParams(params);next.set('finance',section);if(campaign)next.set('financeCampaign',campaign);
 return <a href={'?'+next.toString()} onClick={e=>{if(e.button===0&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){e.preventDefault();setParams(next);}}}>{children}</a>;
}
