import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

// Load env
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

import Razorpay from 'razorpay';
import express from 'express';
import { createPaymentOrder, verifyPayment } from './backend/src/controllers/paymentController';

async function runTests() {
  console.log('=== STARTING RAZORPAY INTEGRATION VERIFICATION ===\n');

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  console.log('1. Checking Environment Variables...');
  if (!keyId || !keySecret) {
    throw new Error('FAILED: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing!');
  }
  console.log(`   RAZORPAY_KEY_ID: ${keyId}`);
  console.log(`   RAZORPAY_KEY_SECRET: [CONFIGURED - length ${keySecret.length}]`);
  console.log('   ✓ Environment variables verified\n');

  // Set up mock Express req/res
  function mockReqRes(body: any, headers: any = {}) {
    const req: any = { body, headers, user: null };
    const res: any = {
      statusCode: 200,
      jsonData: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.jsonData = data;
        return this;
      },
    };
    return { req, res };
  }

  console.log('2. Testing STEP 1: Backend Create Order...');

  // Test 2a: Minimum amount validation (< 100 paise)
  console.log('   - Test 2a: Testing rejection of amount < 100 paise...');
  const { req: reqSmall, res: resSmall } = mockReqRes({ amount: 50 });
  await createPaymentOrder(reqSmall, resSmall);
  if (resSmall.statusCode === 400 && resSmall.jsonData?.success === false) {
    console.log('     ✓ Successfully rejected amount < 100 paise with HTTP 400:', resSmall.jsonData.message);
  } else {
    throw new Error(`Expected 400, got ${resSmall.statusCode}: ${JSON.stringify(resSmall.jsonData)}`);
  }

  // Test 2b: Missing amount and registration
  console.log('   - Test 2b: Testing rejection of missing amount/registration...');
  const { req: reqEmpty, res: resEmpty } = mockReqRes({});
  await createPaymentOrder(reqEmpty, resEmpty);
  if (resEmpty.statusCode === 400 && resEmpty.jsonData?.success === false) {
    console.log('     ✓ Successfully rejected missing amount with HTTP 400:', resEmpty.jsonData.message);
  } else {
    throw new Error(`Expected 400, got ${resEmpty.statusCode}: ${JSON.stringify(resEmpty.jsonData)}`);
  }

  // Test 2c: Valid order creation calling Razorpay API
  console.log('   - Test 2c: Testing valid order creation with Razorpay API (50000 paise = ₹500)...');
  const { req: reqValid, res: resValid } = mockReqRes({
    amount: 50000,
    currency: 'INR',
    receipt: `rcpt_test_${Date.now()}`,
  });
  await createPaymentOrder(reqValid, resValid);

  if (resValid.statusCode === 200 && resValid.jsonData?.order_id) {
    console.log('     ✓ Successfully created order on Razorpay!');
    console.log(`     order_id: ${resValid.jsonData.order_id}`);
    console.log(`     amount: ${resValid.jsonData.amount} paise`);
    console.log(`     currency: ${resValid.jsonData.currency}`);
  } else {
    throw new Error(`Order creation failed with code ${resValid.statusCode}: ${JSON.stringify(resValid.jsonData)}`);
  }

  const createdOrderId = resValid.jsonData.order_id;

  console.log('\n3. Testing STEP 3: Backend Verify Signature...');

  // Test 3a: Missing fields validation
  console.log('   - Test 3a: Testing rejection of missing fields...');
  const { req: reqMissing, res: resMissing } = mockReqRes({ order_id: createdOrderId });
  await verifyPayment(reqMissing, resMissing);
  if (resMissing.statusCode === 400 && resMissing.jsonData?.success === false) {
    console.log('     ✓ Successfully rejected missing fields with HTTP 400:', resMissing.jsonData.message);
  } else {
    throw new Error(`Expected 400, got ${resMissing.statusCode}: ${JSON.stringify(resMissing.jsonData)}`);
  }

  // Test 3b: Invalid signature mismatch
  console.log('   - Test 3b: Testing rejection of invalid signature...');
  const fakePaymentId = `pay_fake_${Date.now()}`;
  const badSignature = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const { req: reqBadSig, res: resBadSig } = mockReqRes({
    order_id: createdOrderId,
    payment_id: fakePaymentId,
    signature: badSignature,
  });
  await verifyPayment(reqBadSig, resBadSig);
  if (resBadSig.statusCode === 400 && resBadSig.jsonData?.success === false) {
    console.log('     ✓ Successfully rejected signature mismatch with HTTP 400:', resBadSig.jsonData.message);
  } else {
    throw new Error(`Expected 400, got ${resBadSig.statusCode}: ${JSON.stringify(resBadSig.jsonData)}`);
  }

  // Test 3c: Valid HMAC-SHA256 signature verification
  console.log('   - Test 3c: Testing valid signature verification with HMAC-SHA256...');
  const validPaymentId = `pay_test_${Date.now()}`;
  const validSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${createdOrderId}|${validPaymentId}`)
    .digest('hex');

  const { req: reqGoodSig, res: resGoodSig } = mockReqRes({
    order_id: createdOrderId,
    payment_id: validPaymentId,
    signature: validSignature,
  });
  await verifyPayment(reqGoodSig, resGoodSig);
  if (resGoodSig.statusCode === 200 && resGoodSig.jsonData?.success === true) {
    console.log('     ✓ Successfully verified valid signature with HTTP 200!');
    console.log('     Response:', JSON.stringify(resGoodSig.jsonData));
  } else {
    throw new Error(`Valid signature check failed with code ${resGoodSig.statusCode}: ${JSON.stringify(resGoodSig.jsonData)}`);
  }

  console.log('\n=== ALL RAZORPAY INTEGRATION TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
