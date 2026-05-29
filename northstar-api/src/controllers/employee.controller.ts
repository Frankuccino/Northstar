// employee controller layer

import { Request, Response } from "express";
import * as employeeService from "../services/employee.service.js";

export const getEmployees = async (_req: Request, res: Response) => {
  try {
    const employees = await employeeService.getAll();
    res.json(employees);
  } catch (err) {
    res.status(500).json({
      message: "Faled to fetch employees",
    });
  }
};

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const employee = await employeeService.create(req.body);
    res.status(201).json(employee);
  } catch (err) {
    res.status(500).json({ message: "Failed to create employee" });
  }
};

export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await employeeService.getById(Number(id));

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json(employee);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch employee " });
  }
};

export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updated = await employeeService.update(Number(id), req.body);

    if (!updated) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json(updated);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update employee" });
  }
};

export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await employeeService.remove(Number(id));
    if (!deleted) {
      return res.status(404).json({
        messag: "Employee not found",
      });
    }

    return res.status(200).json({
      message: "Employee deleted succesfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to delete employee",
    });
  }
};
