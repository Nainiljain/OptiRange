import vehicles from "../data/vehicle.json";

export const getVehicles = async () => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(vehicles), 500);
    });
};

export const mockPredictRange = async (vehicleId: string, temp: number) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                predictedRange: 320,
                tempPenalty: "22%",
                message: "Prediction successful based on mock data"
            });
        }, 800);
    });
};