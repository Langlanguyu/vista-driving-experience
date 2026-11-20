// Small loopback-only static server for the macOS offline package.
#include <arpa/inet.h>
#include <ctype.h>
#include <errno.h>
#include <limits.h>
#include <netinet/in.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <unistd.h>

static void send_all(int fd,const char *data,size_t size){
  while(size){ssize_t n=send(fd,data,size,0);if(n<=0)return;data+=n;size-=(size_t)n;}
}
static const char *mime(const char *p){
  const char *e=strrchr(p,'.');if(!e)return "application/octet-stream";
  if(!strcmp(e,".html"))return "text/html; charset=utf-8";
  if(!strcmp(e,".js"))return "text/javascript";
  if(!strcmp(e,".css"))return "text/css";
  if(!strcmp(e,".json"))return "application/json";
  if(!strcmp(e,".svg"))return "image/svg+xml";
  if(!strcmp(e,".webp"))return "image/webp";
  if(!strcmp(e,".png"))return "image/png";
  if(!strcmp(e,".jpg"))return "image/jpeg";
  if(!strcmp(e,".m4a"))return "audio/mp4";
  if(!strcmp(e,".glb"))return "model/gltf-binary";
  if(!strcmp(e,".woff2"))return "font/woff2";
  if(!strcmp(e,".txt"))return "text/plain; charset=utf-8";
  return "application/octet-stream";
}
static void serve(int fd,const char *root){
  struct timeval timeout={10,0};setsockopt(fd,SOL_SOCKET,SO_RCVTIMEO,&timeout,sizeof(timeout));
  char request[8192],method[16],url[4096],decoded[4096],path[PATH_MAX],real[PATH_MAX];
  ssize_t n=recv(fd,request,sizeof(request)-1,0);if(n<=0)return;request[n]=0;
  if(sscanf(request,"%15s %4095s",method,url)!=2)return;
  if(strcmp(method,"GET")&&strcmp(method,"HEAD")){const char *msg="HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";send_all(fd,msg,strlen(msg));return;}
  char *query=strchr(url,'?');if(query)*query=0;
  size_t len=0;
  for(size_t i=0;url[i]&&len<sizeof(decoded)-1;i++){
    if(url[i]=='%'&&isxdigit(url[i+1])&&url[i+2]&&isxdigit(url[i+2])){char hex[3]={url[i+1],url[i+2],0};int c=(int)strtol(hex,NULL,16);if(!c)return;decoded[len++]=(char)c;i+=2;}
    else decoded[len++]=url[i];
  }
  decoded[len]=0;
  if(decoded[0]!='/')return;
  snprintf(path,sizeof(path),"%s%s%s",root,decoded,decoded[len-1]=='/'?"index.html":"");
  struct stat statbuf;
  if(!realpath(path,real)||strncmp(root,real,strlen(root))||real[strlen(root)]!='/'||stat(real,&statbuf)||!S_ISREG(statbuf.st_mode)){
    const char *msg="HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";send_all(fd,msg,strlen(msg));return;
  }
  FILE *file=fopen(real,"rb");if(!file)return;
  char header[512];int count=snprintf(header,sizeof(header),"HTTP/1.1 200 OK\r\nContent-Type: %s\r\nContent-Length: %lld\r\nConnection: close\r\nX-Content-Type-Options: nosniff\r\n\r\n",mime(real),(long long)statbuf.st_size);
  send_all(fd,header,(size_t)count);
  if(strcmp(method,"HEAD")){char block[65536];size_t amount;while((amount=fread(block,1,sizeof(block),file)))send_all(fd,block,amount);}
  fclose(file);
}
int main(int argc,char **argv){
  if(argc<2){fprintf(stderr,"Usage: vista-server DIRECTORY [--no-open]\n");return 1;}
  char root[PATH_MAX];if(!realpath(argv[1],root)){perror("Directory");return 1;}
  signal(SIGPIPE,SIG_IGN);signal(SIGCHLD,SIG_IGN);
  int sock=socket(AF_INET,SOCK_STREAM,0);
  struct sockaddr_in address={0};address.sin_family=AF_INET;address.sin_addr.s_addr=htonl(INADDR_LOOPBACK);address.sin_port=0;
  if(bind(sock,(struct sockaddr *)&address,sizeof(address))||listen(sock,32)){perror("Local server");return 1;}
  socklen_t size=sizeof(address);getsockname(sock,(struct sockaddr *)&address,&size);
  char link[128];snprintf(link,sizeof(link),"http://127.0.0.1:%d/",ntohs(address.sin_port));
  printf("VISTA offline preview\n%s\nKeep this window open. Press Control-C to stop.\n",link);fflush(stdout);
  if(argc<3||strcmp(argv[2],"--no-open")){if(fork()==0){execl("/usr/bin/open","open",link,(char*)NULL);_exit(1);}}
  for(;;){int fd=accept(sock,NULL,NULL);if(fd<0){if(errno==EINTR)continue;break;}pid_t child=fork();if(child==0){close(sock);serve(fd,root);close(fd);_exit(0);}close(fd);}
  close(sock);return 0;
}
