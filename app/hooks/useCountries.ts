import { japanLocations } from "@/app/data/japanLocations";

const useCountries = () => {
  const getAll = () => japanLocations;

  const getByValue = (value: string) => {
    return japanLocations.find((location) => location.value === value);
  };

  return {
    getAll,
    getByValue,
  };
};

export default useCountries;
