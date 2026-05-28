import { ValidationArguments } from "class-validator";
import {
  arrayMessage,
  booleanMessage,
  dateStringMessage,
  emailMessage,
  enumMessage,
  isInMessage,
  matchesMessage,
  notEmptyMessage,
  stringMessage,
  urlMessage,
  uuidMessage,
} from "./templates";

export const stringValidationMessage = (args: ValidationArguments) =>
  stringMessage(args.property);

export const emailValidationMessage = (args: ValidationArguments) =>
  emailMessage(args.property);

export const urlValidationMessage = (args: ValidationArguments) =>
  urlMessage(args.property);

export const uuidValidationMessage = (args: ValidationArguments) =>
  uuidMessage(args.property);

export const notEmptyValidationMessage = (args: ValidationArguments) =>
  notEmptyMessage(args.property);

export const isInValidationMessage = (args: ValidationArguments) =>
  isInMessage(args.property, args.constraints[0] as readonly string[]);

export const booleanValidationMessage = (args: ValidationArguments) =>
  booleanMessage(args.property);

export const arrayValidationMessage = (args: ValidationArguments) =>
  arrayMessage(args.property);

export const matchesValidationMessage =
  (description: string) => (args: ValidationArguments) =>
    matchesMessage(args.property, description);

export const enumValidationMessage = (args: ValidationArguments) =>
  enumMessage(
    args.property,
    Object.values(args.constraints[0] as Record<string, string>),
  );

export const dateStringValidationMessage = (args: ValidationArguments) =>
  dateStringMessage(args.property);
