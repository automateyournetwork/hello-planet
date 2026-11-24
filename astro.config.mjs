// Standalone demonstration shell; original globe/collector source is unchanged.
import { defineConfig } from 'astro/config';
import { trafficPlugin } from './server/traffic.mjs';
export default defineConfig({
  output:'static', trailingSlash:'always', devToolbar:{enabled:false},
  redirects:{'/stats/':'https://automateyournetwork.com/stats/','/about/':'https://automateyournetwork.com/about/'},
  vite:{plugins:[trafficPlugin()],server:{fs:{deny:['.env','.env.*','**/.git/**','**/private/**','**/*.pem','**/*.key']}}}
});
