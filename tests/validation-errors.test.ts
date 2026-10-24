import assert from 'node:assert/strict';
import test from 'node:test';
import {z} from 'zod';
import {validationMessage} from '../src/lib/validation-errors.ts';

test('validation errors are readable Hebrew and preserve intentional field messages',()=>{
 for(const [schema,value] of [[z.object({amount:z.number()}),{amount:'bad'}],[z.object({name:z.string().min(1)}),{name:''}],[z.object({email:z.email()}),{email:'bad'}],[z.object({amount:z.number().max(10)}),{amount:20}]] as const){
  const result=schema.safeParse(value);assert.equal(result.success,false);if(!result.success){const message=validationMessage(result.error.issues[0]);assert.match(message,/[\u0590-\u05ff]/);assert.doesNotMatch(message,/expected|received|Too small|Invalid input/);}
 }
 const result=z.string().min(1,'יש להזין שם תצוגה.').safeParse('');if(!result.success)assert.equal(validationMessage(result.error.issues[0]),'יש להזין שם תצוגה.');
});
