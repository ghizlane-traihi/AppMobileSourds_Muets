
# ===============================
# IMPORTS
# ===============================
import pandas as pd
import torch
import torch.nn as nn
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib

# ===============================
# 1. CHARGEMENT DU DATASET
# ===============================
data = pd.read_csv("asl_landmarks_final.csv")

# ===============================
# 3. SÉPARATION FEATURES / LABELS
# ===============================
X = data.iloc[:, :-1].values   # 63 valeurs (landmarks)
y = data.iloc[:, -1].values    # lettres

# ===============================
# 4. ENCODAGE DES LABELS
# A → 0, B → 1, etc.
# ===============================
le = LabelEncoder()
y = le.fit_transform(y)
num_classes = len(le.classes_)
print("Nombre de classes :", num_classes)

print("Classes:", le.classes_)

# ===============================
#  5. NORMALISATION (TRÈS IMPORTANT)
# ===============================
X = X / X.max()

# ===============================
# 6. SPLIT TRAIN / TEST
# ===============================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, shuffle=True
)

# ===============================
# 7. CONVERSION EN TENSORS
# ===============================
X_train = torch.tensor(X_train, dtype=torch.float32)
y_train = torch.tensor(y_train, dtype=torch.long)

X_test = torch.tensor(X_test, dtype=torch.float32)
y_test = torch.tensor(y_test, dtype=torch.long)

# ===============================
# 8. MODÈLE AMÉLIORÉ
# ===============================
class Model(nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(63, 256),
            nn.ReLU(),
            nn.Dropout(0.3),   #  anti overfitting
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        return self.net(x)

model = Model(num_classes=len(le.classes_))

# ===============================
#  9. PARAMÈTRES D’ENTRAÎNEMENT
# ===============================
loss_fn = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

# ===============================
# 10. ENTRAÎNEMENT
# ===============================
epochs = 150

from torch.utils.data import DataLoader, TensorDataset

train_dataset = TensorDataset(X_train, y_train)
train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)

for epoch in range(epochs):
    model.train()
    total_loss = 0

    for xb, yb in train_loader:
        outputs = model(xb)
        loss = loss_fn(outputs, yb)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        total_loss += loss.item()

    if (epoch+1) % 10 == 0:
        avg_loss = total_loss / len(train_loader)
        print(f"Epoch {epoch+1}, Loss: {avg_loss:.4f}")

# ===============================
# 11. ÉVALUATION
# ===============================
model.eval()

with torch.no_grad():
    preds = model(X_test)
    predicted = torch.argmax(preds, dim=1)

    acc = (predicted == y_test).float().mean()

print("✅ Accuracy:", acc.item())

# ===============================
# 12. SAUVEGARDE
# ===============================
torch.save(model.state_dict(), "model.pth")
joblib.dump(le, "label_encoder.pkl")

print("✅ Modèle sauvegardé")