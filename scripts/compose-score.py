"""Render VISTA's original electronic score and seamless lab ambience (numpy, afconvert)."""
import os
import subprocess
import tempfile
import wave
from pathlib import Path
import numpy as np

RATE = 32000
OUT = Path('public/audio')
OUT.mkdir(exist_ok=True)
# D minor ninth, Bb major seventh, F add9, C suspended.
VOICES = [(50,57,60,64,65), (46,53,57,60,65), (53,57,60,67,69), (48,55,58,62,65)]
CUES = [(3.8,390),(8.2,515),(24.2,554),(50.8,329),(55.6,440),(85,246),(98,196),(106.5,659),(115.4,554),(124.8,740),(143.5,369),(157.5,440),(173.4,554)]
def freq(note):
    return 440 * 2**((note-69)/12)
def ease(x):
    u=np.clip(x,0,1)
    return u*u*(3-2*u)
def render(name,seconds,film):
    with tempfile.TemporaryDirectory() as tmp:
        wav=Path(tmp)/'score.wav'
        with wave.open(str(wav),'wb') as writer:
            writer.setparams((2,2,RATE,0,'NONE','not compressed'))
            for sec in range(seconds):
                t=sec+np.arange(RATE)/RATE
                mix=np.zeros((RATE,2))
                for idx,notes in enumerate(VOICES):
                    phase=(t-idx*8)%32
                    env=ease(phase/1.5)*(1-ease((phase-8)/1.5))
                    for j,note in enumerate(notes):
                        f=freq(note)
                        for side in range(2):
                            a=2*np.pi*f*t+(0.32+side*.17)*np.sin(2*np.pi*t*(j+1)/32+idx)
                            mix[:,side]+=env*(.072/(1+.23*j))*(np.sin(a)+.23*np.sin(2*a+.4)+.10*np.sin(3*a))
                if film:
                    density=np.interp(t,[0,7,15,43,55,74,80,101,109,135,150,161,175,180],[0,.1,.62,.67,1,.85,.17,.18,.38,.3,.24,.7,.28,0])
                    beat=t%.75
                    key=np.array(VOICES)[(t//8).astype(int)%4,0]
                    pluck=np.sin(2*np.pi*freq(key+12)*beat)*np.exp(-7*beat)*ease(beat/.014)
                    kick=np.sin(2*np.pi*(46*beat+.65*(1-np.exp(-beat*19))))*np.exp(-13*beat)*ease(beat/.008)
                    mix+=density[:,None]*(.094*pluck+.13*kick)[:,None]
                    for start,hz in CUES:
                        d=t-start
                        if d[-1]<0 or d[0]>4:continue
                        env=ease(d/.05)*np.exp(-1.6*np.maximum(0,d))
                        for side in range(2):
                            mix[:,side]+=.09*env*(np.sin(2*np.pi*d*hz)+.37*np.sin(2*np.pi*d*hz*1.502+side*.25))
                    mix*= (ease(t/1.6)*(1-ease((t-174)/6)))[:,None]
                else:
                    # Circular chord envelopes have a live tail at both loop boundaries.
                    mix*=.68
                writer.writeframes((np.tanh(mix*1.55)*30000).astype('<i2').tobytes())
        subprocess.run([os.environ.get('FFMPEG','ffmpeg'),'-loglevel','error','-y','-i',str(wav),'-c:a','aac','-b:a','112k',str(OUT/(name+'.m4a'))],check=True)
render('sightlines',180,True)
render('still-air',32,False)
