#!/bin/bash

if [ "$1" == "server" ]; then
    # Build and deploy the server
    echo "Building and deploying the server..."
    rm -f prodcare.tar
    sudo docker image rm prodcare
    sudo docker image prune -f
    sudo docker build -t prodcare .
    sudo docker images
    sudo docker save -o prodcare.tar prodcare:latest
    # sudo openvpn guest-1.ovpn
    scp -i /home/dungna31/.ssh/id_rsa prodcare.tar vea@112.11.0.1:/home/vea/dungna31/prodcare
    ssh -i /home/dungna31/.ssh/id_rsa -t vea@112.11.0.1 'cd /home/vea/dungna31/prodcare && sudo chmod +x buildscript.sh && sudo ./buildscript.sh && exec bash'
    
elif [ "$1" == "product" ]; then 
    echo "Building product..."
    ssh -i /home/dungna31/.ssh/id_rsa -t vea@112.11.0.1 'cd /home/vea/dungna31/prodcare && sudo chmod +x buildscript.sh && sudo ./buildscript.sh && exec bash'

else
    # Build and deploy the client
    echo "Building the client..."
    cd ..
    cd prodcare_client
    sudo cp .env.prod .env
    npm run build
    sudo cp .env.dev .env
    cd ..

    # Check if the prodcare-static folder exists
    if [ ! -d "./prodcare-server/prodcare-static" ]; then
        mkdir -p ./prodcare-server/prodcare-static
    else
        sudo rm -rf ./prodcare-server/prodcare-static/* # Delete all contents if it exists
    fi

    sudo cp -r ./prodcare_client/build/* ./prodcare-server/prodcare-static/

    echo "Building and deploying the server..."
    cd prodcare-server
    rm -f prodcare.tar
    sudo docker image rm prodcare
    sudo docker image prune -f
    sudo docker build -t prodcare .
    sudo docker images
    sudo docker save -o prodcare.tar prodcare:latest
    scp -i /home/dungna31/.ssh/id_rsa prodcare.tar vea@112.11.0.1:/home/vea/dungna31/prodcare
    ssh -i /home/dungna31/.ssh/id_rsa -t vea@112.11.0.1 'cd /home/vea/dungna31/prodcare && sudo chmod +x buildscript.sh && sudo ./buildscript.sh && exec bash'
fi
