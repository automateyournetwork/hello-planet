export type Score = {
 title:string; bpm:number; lengthBeats:number;
 melody:number[][]; bass:number[][]; inner:[number,number[],number][];
 source?:string; author?:string; license?:string;
};
export type Voice = 'fm'|'bell'|'square';
// Measured 5.04 frequency table: index 0 is rest; index 1 is MIDI 24.
// Integer tuning values are factual measurements, not bundled DOS code.
const pcGlobePitches=[0,33,35,37,39,41,44,46,49,52,55,58,62,65,69,73,78,82,87,93,98,104,110,117,123,131,139,147,156,165,175,185,196,208,220,233,247,262,277,294,311,330,349,370,392,416,440,466,494,523,554,587,622,659,698,740,784,831,880,932,988,1047,1109,1175,1245,1329,1397,1480,1568,1661,1760,1865,1976,2093,2217,2349,2489,2637,2794,2960,3136,3322,3520,3729,3951,4186,4435,4699,4978,5274,5588,5920,6272,6646,7040,7459,7902,8372,8870,9398,9956,10548,11176,11840,12544,13292,14080,14918,15804,16744,17740,18796,19912,21096,22352,23680,25088,26584,28160,29836,31608];
// Original compositions for this visitor atlas, separate from the sourced anthem scores.
export const themes:Record<string,Score> = {
 voyager:{title:'World explorer · original theme',bpm:112,lengthBeats:32,
  melody:[[0,72,1],[1,76,1],[2,79,1.5],[3.5,76,.5],[4,74,1],[5,77,1],[6,81,2],[8,79,1],[9,76,1],[10,74,1],[11,72,1],[12,71,1],[13,74,1],[14,79,2],[16,72,1],[17,76,1],[18,79,1],[19,84,1],[20,83,1],[21,81,1],[22,79,2],[24,77,1],[25,76,1],[26,74,1],[27,71,1],[28,72,4]],
  bass:[[0,48,4],[4,53,4],[8,45,4],[12,43,4],[16,48,4],[20,45,4],[24,53,2],[26,43,2],[28,48,4]],inner:[[0,[60,64],4],[4,[60,65],4],[8,[60,64],4],[12,[59,62],4],[16,[60,64],4],[20,[60,64],4],[24,[60,65],2],[26,[59,62],2],[28,[60,64],4]]},
 night:{title:'Midnight modem · original theme',bpm:90,lengthBeats:24,
  melody:[[0,69,1.5],[1.5,72,.5],[2,76,2],[4,74,1],[5,72,1],[6,71,2],[8,67,1.5],[9.5,71,.5],[10,74,2],[12,72,1],[13,71,1],[14,69,2],[16,65,1],[17,69,1],[18,72,2],[20,71,1],[21,68,1],[22,69,2]],
  bass:[[0,45,4],[4,41,4],[8,43,4],[12,45,4],[16,41,4],[20,40,2],[22,45,2]],inner:[[0,[57,60],4],[4,[57,60],4],[8,[55,59],4],[12,[57,60],4],[16,[57,60],4],[20,[56,59],2],[22,[57,60],2]]}
};
export class PCGlobeAudio {
 private context:AudioContext|null=null;
 private gain:GainNode|null=null;
 private sources=new Set<AudioBufferSourceNode>();
 private timer=0;
 private generation=0;
 enabled=false;
 volume=.3;
 voice:Voice='fm';
 constructor(private status:(message:string,playing:boolean)=>void){}
 async enable(){
  this.context??=new AudioContext();
  if(!this.gain){this.gain=this.context.createGain();this.gain.gain.value=this.volume*.45;this.gain.connect(this.context.destination);}
  await this.context.resume();this.enabled=true;
 }
 setVolume(value:number){this.volume=Math.max(0,Math.min(1,value));if(this.context&&this.gain)this.gain.gain.setTargetAtTime(this.volume*.45,this.context.currentTime,.02);}
 stop(message='Playback stopped.'){
  this.generation++;clearTimeout(this.timer);
  for(const source of this.sources){try{source.stop();}catch{}source.disconnect();}
  this.sources.clear();this.status(message,false);
 }
 mute(){this.stop('Sound off.');this.enabled=false;}
 private note(midi:number,duration:number,start:number,level:number){
  if(!this.context||!this.gain)return;
  // 22.05 kHz signed 16-bit PCM, generated with a two-operator FM voice.
  // This evokes SB16/OPL-era synthesis; it is not a hardware emulator.
  const rate=22050,release=.08,length=Math.ceil((duration+release)*rate);
  const buffer=this.context.createBuffer(1,length,rate),samples=buffer.getChannelData(0);
  const voice=this.voice;
  const frequency=voice==='square'?(pcGlobePitches[midi-23]||440*2**((midi-69)/12)):440*2**((midi-69)/12);
  // PC Globe 5.04's unpacked pitch routine (file offset 0x15f3d)
  // divides 0x123540 by Hz and programs PIT channel 2. Reproduce its
  // pitch rounding in the speaker voice, using our licensed note data.
  const hz=voice==='square'?1193280/Math.floor(1193280/frequency):frequency;
  for(let i=0;i<length;i++){
   const t=i/rate,phase=2*Math.PI*hz*t;
   const envelope=Math.min(1,t/.012)*Math.max(0,Math.min(1,(duration+release-t)/release));
   const decay=voice==='bell'?Math.exp(-t*3):.65+.35*Math.exp(-t*5);
   const sample=voice==='square'?(Math.sin(phase)>=0?.55:-.55):Math.sin(phase+(voice==='bell'?2.6:1.7)*Math.exp(-t*(voice==='bell'?2:5))*Math.sin(phase*(voice==='bell'?3:2)));
   samples[i]=Math.round(sample*envelope*decay*level*32767)/32767;
  }
  const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.gain);this.sources.add(source);
  source.onended=()=>{this.sources.delete(source);source.disconnect();};source.start(start);
 }
 click(){if(this.enabled&&this.context)this.note(84,.045,this.context.currentTime,.14);}
 async play(score:Score){
  this.stop('Preparing 16-bit audio…');const generation=this.generation;
  await this.enable();if(generation!==this.generation)return;
  const start=this.context!.currentTime+.06,beat=60/score.bpm;
  for(const [at,midi,duration] of score.melody)this.note(midi,duration*beat*.92,start+at*beat,.65);
  for(const [at,midi,duration] of score.bass)this.note(midi,duration*beat*.88,start+at*beat,.19);
  if(this.voice!=='square')for(const [at,notes,duration] of score.inner)for(const midi of notes)this.note(midi,duration*beat*.86,start+at*beat,.09);
  this.status(`Playing: ${score.title} · 16-bit / 22 kHz`,true);
  this.timer=window.setTimeout(()=>{if(generation===this.generation)this.status('Playback complete. Choose another country or theme.',false);},(score.lengthBeats*beat+.2)*1000);
 }
 dispose(){this.mute();void this.context?.close();}
}
