import cv2
import torch
import numpy as np
import mediapipe as mp
import joblib
import time
import torch.nn.functional as F
from collections import deque, Counter

# ===============================
#  MODÈLE (IDENTIQUE AU TRAIN)
# ===============================
class Model(torch.nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        self.net = torch.nn.Sequential(
            torch.nn.Linear(63, 256),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.3),
            torch.nn.Linear(256, 128),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.3),
            torch.nn.Linear(128, num_classes)
        )

    def forward(self, x):
        return self.net(x)

# ===============================
#  CHARGEMENT
# ===============================
le = joblib.load("label_encoder.pkl")
num_classes = len(le.classes_)

model = Model(num_classes)
model.load_state_dict(torch.load("model.pth", map_location="cpu"))
model.eval()

# ===============================
# MEDIA PIPE
# ===============================
mp_hands = mp.solutions.hands.Hands()
cap = cv2.VideoCapture(2)

# ===============================
# STABILISATION
# ===============================
buffer = deque(maxlen=10)

last_letter = ""
stable_counter = 0
threshold = 6  # répétitions nécessaires

# ===============================
# COOLDOWN
# ===============================
last_time = 0
cooldown = 0.5  # secondes

sentence = ""

# ===============================
# LOOP CAMERA
# ===============================
while True:
    ret, frame = cap.read()
    if not ret:
        continue

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = mp_hands.process(rgb)

    # ===============================
    # PAS DE MAIN → RESET
    # ===============================
    if not result.multi_hand_landmarks:
        buffer.clear()
        last_letter = ""
        stable_counter = 0
        if cv2.waitKey(1) & 0xFF == 27:
            break
        continue

    letter = ""

    for hand in result.multi_hand_landmarks:

        # ===============================
        # LANDMARKS
        # ===============================
        landmarks = []
        for lm in hand.landmark:
            landmarks.extend([lm.x, lm.y, lm.z])

        X = np.array(landmarks)
        X = X / (np.max(X) + 1e-6)  # protection division
        X = torch.tensor([X], dtype=torch.float32)

        # ===============================
        #  PRÉDICTION
        # ===============================
        with torch.no_grad():
            pred = model(X)

            probs = F.softmax(pred, dim=1)
            confidence, idx = torch.max(probs, dim=1)

            confidence = confidence.item()
            idx = idx.item()

            letter = le.inverse_transform([idx])[0]

        # ===============================
        # FILTRE DE CONFIANCE
        # ===============================
        if confidence < 0.70:
            letter = ""
            buffer.clear()

        # ===============================
        # BUFFER STABILITÉ
        # ===============================
        if letter != "":
            buffer.append(letter)

        if len(buffer) == 5:
            most_common = Counter(buffer).most_common(1)[0][0]

            # ===============================
            # ANTI-RÉPÉTITION
            # ===============================
            if most_common == last_letter:
                stable_counter += 1
            else:
                stable_counter = 0
                last_letter = most_common

            # ===============================
            # COOLDOWN
            # ===============================
            current_time = time.time()

            if stable_counter >= threshold and (current_time - last_time) > cooldown:

                if most_common == "space":
                    sentence += " "
                elif most_common == "del":
                    sentence = sentence[:-1]
                else:
                    sentence += most_common

                last_time = current_time
                stable_counter = 0

            buffer.clear()

        # ===============================
        # AFFICHAGE
        # ===============================
        cv2.putText(frame, f"Letter: {letter}", (50, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)

        cv2.putText(frame, f"Text: {sentence}", (50, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255,0,0), 2)

    cv2.imshow("Sign Language Recognition", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()