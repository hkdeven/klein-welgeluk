"use client";

import { createContext, useContext } from "react";

export const EditModeContext = createContext<{
  editMode: boolean;
  setEditMode: (v: boolean) => void;
}>({ editMode: false, setEditMode: () => {} });

export const useEditMode = () => useContext(EditModeContext);
