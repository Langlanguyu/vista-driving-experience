"""Mux the browser's post-gain recording at the first marker-free frame."""
import os
from pathlib import Path
import subprocess
ff=os.environ.get('FFMPEG','ffmpeg')
out=Path('docs/verification/r62')
source=out/'production/browser-film.webm'
def run(*args):
    subprocess.run([ff,'-y','-loglevel','error',*map(str,args)],check=True)
raw=subprocess.check_output([ff,'-loglevel','error','-i',str(source),'-t','15','-vf','fps=25,crop=16:16:3:3,scale=1:1','-pix_fmt','rgb24','-f','rawvideo','-'])
slate=[raw[i]>160 and raw[i+1]<95 and raw[i+2]>160 for i in range(0,len(raw),3)]
start=(max(i for i,v in enumerate(slate) if v)+1)/25
movie=out/'VISTA-R6.2.mp4'
run('-ss',start,'-i',source,'-i',out/'production/browser-audio.webm','-map','0:v','-map','1:a','-t',180,'-c:v','libx264','-preset','veryfast','-crf',19,'-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',movie)
for name,t,d in [('First-scroll',0,15),('Optical-reveal',105,31)]:
    run('-ss',t,'-i',movie,'-t',d,'-c:v','libx264','-preset','veryfast','-crf',20,'-c:a','aac','-movflags','+faststart',out/(name+'.mp4'))
print('Slate end: %.3f s. Source audio: browser MediaStreamDestination.'%start)
