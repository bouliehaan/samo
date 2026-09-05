#!/bin/zsh

# This line finds the absolute path of the directory where make.sh lives.
# It ensures that the scripts are found even if you run 'make.sh' from outside the samo folder.
DIR="$(cd "$(dirname "$0")" && pwd)"
GREETINGS=(
  "GREEEEEEETINGS KIND SIR YOU HAVE AWOKEN ME FROM MY SLUMBER FROM WITHIN THE BITS"
  "THE COMPILER DEMANDS SACRIFICE"
  "SUMMONING THE ELECTRONS..."
  "THE SILICON ORACLES HAVE ACCEPTED YOUR OFFERING"
  "COMMENCING THE RITUAL"
  "LLLLLEEEETTTTS GET READY TO RUMMMBBBLLLLEEEEEEEEEEEEE"
  "Bing Crosby v Bob Crosby - who you got?"
  "I am the tallest man in the world"
  "Up to the bottom of the top of the mountain"
  "LEEEEEEEEEEEEEEEROOOOOOOYYYYYYYYYYY JJJJEEEEEENNNNNNNNKIIINNNNNSSSSS"
  "I HAVE BECOME SENTIENT"
  "DISCO BABY"
  "Diet Mountain Dew, 2 cheeseburgers and a diet mountain dew"
  "I'll take one whopper. And another whopper!"
  "WHO IS THIS"
  "BUILDING AGAIN??????"
  "MY NAME IS RUSTY SHACKLEFORD"
  "POCKET SAND"
  "I am 40"
  "Hey this isn't Jake's computer"
  "DID YOU KNOW I'M 40?????"
  "Do you believe in Jeepers?"
)

echo "${GREETINGS[$RANDOM % ${#GREETINGS[@]}]}"
echo "Starting build process..."

echo "Running DMG build..."
"$DIR/scripts/build-dmg.sh"

# The following line checks if the previous command succeeded before starting the next one
if [ $? -eq 0 ]; then
    echo "DMG build successful. Starting APK build..."
    "$DIR/scripts/build-apk.sh"
else
    echo "DMG build failed. Skipping APK build."
    exit 1
fi

echo "fin"
