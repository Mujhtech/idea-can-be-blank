import toast from "react-hot-toast";

export const successAlert = (message: any) => {
  toast.success(message, {
    position: "bottom-right",
  });
};

export const errorAlert = (message: any) => {
  toast.error(message, {
    position: "bottom-right",
  });
};
