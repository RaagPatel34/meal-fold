import {env} from 'cloudflare:workers';
export function database(){if(!env.DB)throw new Error('Meal storage is unavailable');return env.DB;}
