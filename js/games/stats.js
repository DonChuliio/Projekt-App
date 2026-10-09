// Winner history is authoritative; normal-player wins and unscored rounds do not count.
export function imposterStats(players,history){
 return players.filter(p=>p.active!==false).map(p=>({name:p.name,wins:history.filter(r=>r.winner==='imposter'&&r.imposters.includes(p.name)).length})).sort((a,b)=>b.wins-a.wins||a.name.localeCompare(b.name,'de'));
}
