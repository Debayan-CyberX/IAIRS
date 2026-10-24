// A signed distance field of the *actual headline*, generated locally from its
// glyph mask. This makes the liquid an extrusion of typography, not a sculpture.
export function headlineDistance({data,width,height}){
  const size=width*height,inside=new Float32Array(size),outside=new Float32Array(size),far=width+height;
  for(let i=0;i<size;i++){const ink=data[i*4+3]>90;inside[i]=ink?0:far;outside[i]=ink?far:0;}
  const diagonal=Math.SQRT2;
  function transform(field){
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=y*width+x;let d=field[i];
      if(x)d=Math.min(d,field[i-1]+1);
      if(y){d=Math.min(d,field[i-width]+1);if(x)d=Math.min(d,field[i-width-1]+diagonal);if(x+1<width)d=Math.min(d,field[i-width+1]+diagonal);}
      field[i]=d;
    }
    for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
      const i=y*width+x;let d=field[i];
      if(x+1<width)d=Math.min(d,field[i+1]+1);
      if(y+1<height){d=Math.min(d,field[i+width]+1);if(x)d=Math.min(d,field[i+width-1]+diagonal);if(x+1<width)d=Math.min(d,field[i+width+1]+diagonal);}
      field[i]=d;
    }
  }
  transform(inside);transform(outside);
  const encoded=new Uint8Array(size),range=32;
  for(let i=0;i<size;i++)encoded[i]=Math.round(Math.max(0,Math.min(255,128+(inside[i]-outside[i])*127/range)));
  return {encoded,width,height,range};
}
