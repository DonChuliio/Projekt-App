import { getSession,getValidAccessToken } from '../auth/auth.js';
import { gameRpc } from './api.js?v=1.96';
export async function manageSieve(p_action,p_game=null,p_data={}){
 const owner=getSession()?.user?.id;if(!owner)throw new Error('Bitte anmelden.');const token=await getValidAccessToken();if(getSession()?.user?.id!==owner)throw new Error('Anmeldung geändert.');
 const result=await gameRpc('sieve_manage',{p_action,p_game,p_data},token);if(getSession()?.user?.id!==owner)throw new Error('Anmeldung geändert.');return result;
}
