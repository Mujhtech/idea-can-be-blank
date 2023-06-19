import Modal from "react-modal";
import { useState } from "react";

type ManageGiveawayModalProps = {
  isOpen: boolean;
  onDismiss: () => void;
};

const customStyles = {
  content: {
    margin: "10%",
    borderRadius: "0px",
    padding: "0",
    boxShadow: "0",
    background: "#FCF6F1",
    border: "1px solid #CCCCCC",
    height: "fit-content",
  },
};

export default function ManageGiveawayModal({
  isOpen,
}: ManageGiveawayModalProps) {
  return <Modal isOpen={isOpen} style={customStyles}></Modal>;
}
