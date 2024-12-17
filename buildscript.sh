cd ..
cd prodcare_client
sudo cp .env.prod .env
npm run build
sudo cp .env.dev .env
cd ..
sudo cp -r ./prodcare_client/build/* ./prodcare-server/prodcare-static/
cd prodcare-server
rm -f prodcare.tar
sudo docker image rm prodcare
sudo docker image prune -f
sudo docker build -t prodcare .
sudo docker save -o prodcare.tar prodcare:latest
sudo openvpn guest-1.ovpn
sudo scp prodcare.tar developer@112.10.0.100:/home/developer/dungna31
ssh -t developer@112.10.0.100 'cd /home/developer/dungna31/prodcare && chmod +x buildscript.sh && sudo ./buildscript.sh && exec bash'

