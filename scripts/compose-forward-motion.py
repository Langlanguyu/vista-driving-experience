"""Forward Motion. 96 bars at 128 BPM, D major. Original VISTA instrumental."""
import os
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 44100
BEAT = 60 / 128
mix = np.zeros((180 * SR, 2), dtype=np.float32)
rng = np.random.default_rng(610)
chords = [(38, (62,66,69,73)), (33,(61,64,69,71)), (35,(62,66,69,71)), (31,(59,62,66,69))]
hook = [(0,78,.62),(.75,76,.22),(1,74,.82),(2.5,69,.38),(3,73,.65)]
answer = [(0,74,.42),(.5,76,.4),(1,78,.76),(2,81,.9),(3.25,78,.45)]
def place(start, sig, pan=0):
    start = round(start * SR)
    mono = sig[:max(0,min(len(sig),len(mix)-start))]
    if len(mono):
        mix[start:start+len(mono),0] += mono*np.sqrt((1-pan)/2)
        mix[start:start+len(mono),1] += mono*np.sqrt((1+pan)/2)
def axis(d):return np.arange(round(SR*d))/SR
def env(t, attack, release):
    return np.minimum(1,t/attack)*np.minimum(1,np.maximum(0,t[-1]-t)/release)
def note(at,n,beats,kind,amp,pan=0):
    t=axis(beats*BEAT);f=440*2**((n-69)/12);phase=2*np.pi*f*t
    if kind=='bass':
        y=(np.sin(phase)+.32*np.sin(2*phase)+.17*np.sin(3*phase)*np.exp(-7*t))*np.exp(-2*t)
        shape=env(t,.008,.045)
    elif kind=='lead':
        y=(np.sin(phase+1.45*np.exp(-7*t)*np.sin(2*phase))+.24*np.sin(phase*1.003)+.16*np.sin(2*phase))*np.exp(-1.5*t)
        shape=env(t,.012,.105)
    else:
        y=(np.sin(phase)+.35*np.sin(phase*1.002)+.28*np.sin(2*phase)+.10*np.sin(3*phase))*np.exp(-3.3*t)
        shape=env(t,.022,.09)
    sound=amp*shape*y
    place(at,sound,pan)
    if kind=='lead':
        place(at+BEAT*.75,sound*.22,-.57);place(at+BEAT*1.5,sound*.10,.53)
def drum(at,kind,amp,pan=0):
    t=axis(.36 if kind=='kick' else .23);noise=rng.normal(0,.72,len(t));high=np.diff(noise,prepend=0)
    if kind=='kick': sig=np.sin(2*np.pi*(46*t+2.4*(1-np.exp(-t*41))))*np.exp(-13*t)+.06*noise*np.exp(-120*t)
    elif kind=='snare':sig=.52*np.sin(2*np.pi*176*t)*np.exp(-28*t)+.49*high*np.exp(-22*t)+.21*noise*np.exp(-13*t)
    else:sig=high*np.exp(-t*(48 if kind=='hat' else 19))*.5
    place(at,amp*sig*env(t,.002,.018),pan)
for bar in range(96):
    at=bar*4*BEAT
    root,tones=chords[(bar//2)%4]
    if bar>=88:root,tones=chords[[3,1,0,0][(bar-88)//2]]
    intro=bar<8;quiet=40<=bar<56;optic=56<=bar<73;coda=bar>=94
    intensity=.64 if intro or quiet else (.83 if optic else 1)
    for b in ([0,2] if intro or quiet or optic else [0,1,2,3]):
        if not coda:drum(at+b*BEAT,'kick',.52*intensity)
    if not coda:
        for b in ([3] if intro or quiet else [1,3]):drum(at+b*BEAT,'snare',.31*intensity,.08)
        for i in range(8):
            drum(at+i*.5*BEAT,'open' if bar>=24 and i==7 else 'hat',(.095 if i%2 else .043)*intensity,.28 if i%2 else -.23)
    for b,delta,length in ([(0,0,1.4),(2.5,7,.7)] if quiet else [(0,0,.70),(.75,12,.21),(1.5,0,.42),(2,0,.68),(2.75,7,.30),(3.5,12,.34)]):
        if not coda:note(at+b*BEAT,root+delta,length,'bass',.29*intensity)
    for b in ([0] if quiet or coda else [.5,1.5,2.75]):
        for j,n in enumerate(tones):
            note(at+b*BEAT,n,3.6 if coda or quiet else .68,'keys',.084,-.55+j*.31)
    melody=hook if bar%4<2 else answer
    if quiet:melody=[(0,74,1.45),(2.5,73,.8)]
    if optic:melody=[(0,tones[0]+12,.55),(1,tones[1]+12,.66),(2,tones[2]+12,.9),(3.5,tones[1]+12,.4)]
    if coda:melody=[(0,78 if bar==94 else 74,3.8)]
    if bar%2==0 or 24<=bar<40 or bar>=82:
        for b,n,l in melody:note(at+b*BEAT,n,l,'lead',.18*intensity,.08)
    if 24<=bar<40 or 81<=bar<94:
        for i in range(8):note(at+i*.5*BEAT,tones[i%4]+12,.32,'keys',.06,(-1)**i*.59)
    if bar in [7,23,39,55,72,88]:
        for i in range(4):drum(at+(3+i*.25)*BEAT,'snare',.07+.035*i,-.15+.1*i)
mix[:SR//3]*=np.linspace(0,1,SR//3)[:,None]
mix[-SR:]*=np.linspace(1,0,SR)[:,None]
out=Path('public/audio/forward-motion.m4a')
with tempfile.TemporaryDirectory() as tmp:
    wav=Path(tmp)/'master.wav'
    with wave.open(str(wav),'wb') as f:
        f.setparams((2,2,SR,0,'NONE','not compressed'));f.writeframes((np.tanh(1.42*mix)*31500).astype('<i2').tobytes())
    subprocess.run([os.environ.get('FFMPEG','ffmpeg'),'-y','-loglevel','error','-i',str(wav),'-c:a','aac','-b:a','160k',str(out)],check=True)
