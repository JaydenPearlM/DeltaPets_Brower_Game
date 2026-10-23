import { useNavigate } from "react-router-dom";
import LostKithRegistry from "@/pages/petsPage/components/LostKithRegistry/LostKithRegistry";

export default function KithnaRegistry() {
  const navigate = useNavigate();

  return (
    <LostKithRegistry
      open
      onClose={() => navigate("/cities/kithna")}
      onRecovered={() => navigate("/pet")}
    />
  );
}
